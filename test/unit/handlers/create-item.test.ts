import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { handler } from '@/handlers/create-item';
import { createApiEvent } from '../../helpers/api-gateway-event';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
  s3Mock.on(PutObjectCommand).resolves({ ETag: '"abc123"' });
  process.env.BUCKET_NAME = 'test-bucket';
});

describe('POST /items handler', () => {
  it('should create item, persist to S3, and return 201', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ name: 'Test Item', description: 'A test' }),
    });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test Item');
    expect(body.description).toBe('A test');
    expect(body.createdAt).toBeDefined();

    // Verify S3 write
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: 'test-bucket',
      Key: `items/${body.id}.json`,
      ContentType: 'application/json',
    });
  });

  it('should trim whitespace from name', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(201);
    expect(body.name).toBe('Trimmed Name');
  });

  it('should return 400 for missing name', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ description: 'No name provided' }),
    });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid JSON body', async () => {
    const event = createApiEvent({ body: 'not-json{{{' });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(400);
    expect(body.error).toBe('INVALID_JSON');
  });

  it('should return 400 for empty body', async () => {
    const event = createApiEvent({ body: null });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(400);
    expect(body.error).toBe('INVALID_JSON');
  });

  it('should return 400 for name exceeding max length', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ name: 'x'.repeat(256) }),
    });

    const result = await handler(event, {} as never, {} as never);

    expect((result as { statusCode: number }).statusCode).toBe(400);
    expect(JSON.parse((result as { body: string }).body).error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for whitespace-only name', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ name: '   ' }),
    });

    const result = await handler(event, {} as never, {} as never);

    expect((result as { statusCode: number }).statusCode).toBe(400);
    expect(JSON.parse((result as { body: string }).body).error).toBe('VALIDATION_ERROR');
  });

  it('should include requestId in error responses', async () => {
    const event = createApiEvent({ body: 'bad' });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect(body.requestId).toBeDefined();
  });

  it('should omit description when not provided', async () => {
    const event = createApiEvent({
      body: JSON.stringify({ name: 'No Desc' }),
    });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(201);
    expect(body.description).toBeUndefined();
  });

  it('should return 500 when S3 write fails', async () => {
    s3Mock.on(PutObjectCommand).rejects({
      name: 'InternalError',
      message: 'S3 unavailable',
      $metadata: { httpStatusCode: 500 },
    });

    const event = createApiEvent({
      body: JSON.stringify({ name: 'Will Fail' }),
    });

    const result = await handler(event, {} as never, {} as never);
    const body = JSON.parse((result as { body: string }).body);

    expect((result as { statusCode: number }).statusCode).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.requestId).toBeDefined();
  });
});
