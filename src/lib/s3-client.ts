import { S3Client } from '@aws-sdk/client-s3';
import { loadConfig } from './config.js';

let cachedClient: S3Client | undefined;

export function createS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const config = loadConfig();

  if (config.isLocal) {
    cachedClient = new S3Client({
      endpoint: config.localstackEndpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  } else {
    cachedClient = new S3Client({ region: config.region });
  }

  return cachedClient;
}

/** Reset cached client — used in tests */
export function resetS3Client(): void {
  cachedClient = undefined;
}
