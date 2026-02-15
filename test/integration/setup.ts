import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { beforeAll } from 'vitest';

const LOCALSTACK_ENDPOINT = 'http://localhost:4566';

export const TEST_BUCKET = 'test-bucket';

export const s3Client = new S3Client({
  endpoint: LOCALSTACK_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

beforeAll(async () => {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (
      error.name !== 'BucketAlreadyOwnedByYou' &&
      error.name !== 'BucketAlreadyExists'
    ) {
      throw err;
    }
  }
});
