import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client } from '../lib/s3-client.js';
import { classifyS3Error } from '../lib/errors.js';
import { loadConfig } from '../lib/config.js';

interface RetrieveResult {
  status: 'success';
  metadata: {
    contentType?: string;
    lastModified?: string;
    versionId?: string;
    contentLength?: number;
  };
  data: unknown;
}

async function retrieveJsonFile(
  bucketName: string,
  key: string,
): Promise<RetrieveResult> {
  const s3 = createS3Client();

  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );

    const body = await response.Body!.transformToString();
    const data: unknown = JSON.parse(body);

    return {
      status: 'success',
      metadata: {
        contentType: response.ContentType,
        lastModified: response.LastModified?.toISOString(),
        versionId: response.VersionId,
        contentLength: response.ContentLength,
      },
      data,
    };
  } catch (error) {
    throw classifyS3Error(error);
  }
}

// --- CLI entrypoint ---
async function main(): Promise<void> {
  const config = loadConfig();
  const key = process.argv[2] ?? 'data/sample.json';

  try {
    const result = await retrieveJsonFile(config.bucketName, key);
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
