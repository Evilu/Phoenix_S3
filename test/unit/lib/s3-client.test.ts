import { describe, it, expect, beforeEach } from 'vitest';
import { createS3Client, resetS3Client } from '@/lib/s3-client';
import { S3Client } from '@aws-sdk/client-s3';

describe('createS3Client', () => {
  beforeEach(() => {
    resetS3Client();
    delete process.env.IS_LOCAL;
    delete process.env.LOCALSTACK_HOSTNAME;
  });

  it('should return an S3Client instance', () => {
    const client = createS3Client();
    expect(client).toBeInstanceOf(S3Client);
  });

  it('should return the same cached instance on subsequent calls', () => {
    const client1 = createS3Client();
    const client2 = createS3Client();
    expect(client1).toBe(client2);
  });

  it('should configure for LocalStack when IS_LOCAL is set', () => {
    process.env.IS_LOCAL = 'true';
    const client = createS3Client();
    expect(client).toBeInstanceOf(S3Client);
  });

  it('should configure for LocalStack when LOCALSTACK_HOSTNAME is set', () => {
    process.env.LOCALSTACK_HOSTNAME = 'localstack';
    const client = createS3Client();
    expect(client).toBeInstanceOf(S3Client);
  });

  it('should return a fresh client after reset', () => {
    const client1 = createS3Client();
    resetS3Client();
    const client2 = createS3Client();
    expect(client1).not.toBe(client2);
  });
});
