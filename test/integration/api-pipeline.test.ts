import { describe, it, expect, beforeAll } from 'vitest';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, apiBaseUrl, deployedBucket } from './setup';

describe('Exercise 2: API Gateway → Lambda → S3 Pipeline', () => {
  beforeAll(() => {
    if (!apiBaseUrl || !deployedBucket) {
      console.warn(
        'Skipping pipeline tests — stacks not deployed. Run: npm run local:deploy',
      );
    }
  });

  it('should create an item via POST and persist it to S3', async () => {
    if (!apiBaseUrl) return;

    const payload = { name: 'Integration Test Item', description: 'E2E test' };

    const response = await fetch(`${apiBaseUrl}items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Integration Test Item');
    expect(body.description).toBe('E2E test');
    expect(body.createdAt).toBeDefined();

    // Verify the item was persisted to S3
    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: deployedBucket,
        Key: `items/${body.id}.json`,
      }),
    );

    const stored = JSON.parse(await s3Response.Body!.transformToString());
    expect(stored.id).toBe(body.id);
    expect(stored.name).toBe('Integration Test Item');
    expect(s3Response.ContentType).toBe('application/json');

    // Clean up
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: deployedBucket,
        Key: `items/${body.id}.json`,
      }),
    );
  });

  it('should return 400 for missing name', async () => {
    if (!apiBaseUrl) return;

    const response = await fetch(`${apiBaseUrl}items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'no name' }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBeDefined();
  });

  it('should return 400 for invalid JSON', async () => {
    if (!apiBaseUrl) return;

    const response = await fetch(`${apiBaseUrl}items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('INVALID_JSON');
  });

  it('should return 400 for empty name', async () => {
    if (!apiBaseUrl) return;

    const response = await fetch(`${apiBaseUrl}items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should handle two items without conflict (idempotency)', async () => {
    if (!apiBaseUrl) return;

    const [res1, res2] = await Promise.all([
      fetch(`${apiBaseUrl}items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Item A' }),
      }),
      fetch(`${apiBaseUrl}items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Item B' }),
      }),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body1.id).not.toBe(body2.id);

    // Clean up
    await Promise.all([
      s3Client.send(
        new DeleteObjectCommand({
          Bucket: deployedBucket,
          Key: `items/${body1.id}.json`,
        }),
      ),
      s3Client.send(
        new DeleteObjectCommand({
          Bucket: deployedBucket,
          Key: `items/${body2.id}.json`,
        }),
      ),
    ]);
  });
});
