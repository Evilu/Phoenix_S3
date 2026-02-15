import { PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createS3Client } from '../lib/s3-client.js';
import { classifyS3Error } from '../lib/errors.js';
import { loadConfig } from '../lib/config.js';

interface UploadResult {
  status: 'success';
  bucket: string;
  key: string;
  versionId?: string;
  sizeBytes: number;
}

async function verifyBucketAccess(bucket: string): Promise<void> {
  const s3 = createS3Client();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    throw classifyS3Error(error);
  }
}

async function uploadJsonFile(
  bucketName: string,
  key: string,
  filePath: string,
): Promise<UploadResult> {
  const s3 = createS3Client();

  // 1. Verify bucket is accessible
  await verifyBucketAccess(bucketName);

  // 2. Read and validate JSON
  const content = await readFile(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`File is not valid JSON: ${filePath}`);
  }

  // 3. Upload with metadata
  const body = JSON.stringify(parsed, null, 2);
  const sizeBytes = Buffer.byteLength(body);

  const result = await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      Metadata: {
        'uploaded-at': new Date().toISOString(),
        'content-length': String(sizeBytes),
      },
    }),
  );

  return {
    status: 'success',
    bucket: bucketName,
    key,
    versionId: result.VersionId,
    sizeBytes,
  };
}

// --- CLI entrypoint ---
async function main(): Promise<void> {
  const config = loadConfig();
  const filePath = process.argv[2] ?? resolve('sample-data.json');
  const key = process.argv[3] ?? 'data/sample.json';

  // Create sample file if no arg provided and file doesn't exist
  if (!process.argv[2]) {
    const { writeFile } = await import('fs/promises');
    const samplePath = resolve('sample-data.json');
    try {
      await readFile(samplePath);
    } catch {
      await writeFile(
        samplePath,
        JSON.stringify(
          {
            id: 1,
            name: 'Sample Item',
            description: 'Created by upload script',
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      console.log(JSON.stringify({ info: 'Created sample-data.json' }));
    }
  }

  try {
    const result = await uploadJsonFile(config.bucketName, key, filePath);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        code: (error as { code?: string }).code,
        isRetryable: (error as { isRetryable?: boolean }).isRetryable,
      }),
    );
    process.exit(1);
  }
}

main();
