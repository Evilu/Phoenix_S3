import { describe, it, expect } from 'vitest';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client, TEST_BUCKET } from './setup';

describe('S3 Upload & Retrieve (LocalStack)', () => {
  const KEY = `test-${Date.now()}.json`;

  it('should upload JSON to S3', async () => {
    const data = { test: true, timestamp: Date.now() };

    const result = await s3Client.send(
      new PutObjectCommand({
        Bucket: TEST_BUCKET,
        Key: KEY,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
      }),
    );

    expect(result.$metadata.httpStatusCode).toBe(200);
  });

  it('should retrieve the uploaded JSON', async () => {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: TEST_BUCKET, Key: KEY }),
    );

    const body = JSON.parse(await result.Body!.transformToString());
    expect(body.test).toBe(true);
    expect(result.ContentType).toBe('application/json');
  });

  it('should return NoSuchKey for missing objects', async () => {
    await expect(
      s3Client.send(
        new GetObjectCommand({
          Bucket: TEST_BUCKET,
          Key: 'definitely-does-not-exist.json',
        }),
      ),
    ).rejects.toMatchObject({ name: 'NoSuchKey' });
  });

  it('should clean up the test object', async () => {
    const result = await s3Client.send(
      new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: KEY }),
    );
    expect(result.$metadata.httpStatusCode).toBe(204);
  });
});
