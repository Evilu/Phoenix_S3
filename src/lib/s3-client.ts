import { S3Client } from '@aws-sdk/client-s3';

let cachedClient: S3Client | undefined;

function isLocal(): boolean {
  return Boolean(process.env.LOCALSTACK_HOSTNAME || process.env.IS_LOCAL);
}

export function createS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  if (isLocal()) {
    const host = process.env.LOCALSTACK_HOSTNAME ?? 'localhost';
    cachedClient = new S3Client({
      endpoint: `http://${host}:4566`,
      region: process.env.AWS_REGION ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  } else {
    cachedClient = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
  }

  return cachedClient;
}

/** Reset cached client — used in tests */
export function resetS3Client(): void {
  cachedClient = undefined;
}
