import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '@aws-lambda-powertools/logger';
import { randomUUID } from 'crypto';
import { createS3Client } from '../lib/s3-client.js';
import { classifyS3Error } from '../lib/errors.js';

const logger = new Logger({ serviceName: 'create-item' });
const s3 = createS3Client();

// --- Validation ---

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

interface CreateItemRequest {
  name: string;
  description?: string;
}

function validateRequest(body: unknown): CreateItemRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const { name, description } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('name is required and must be a non-empty string');
  }

  if (name.length > 255) {
    throw new ValidationError('name must be 255 characters or fewer');
  }

  return {
    name: name.trim(),
    description: typeof description === 'string' ? description : undefined,
  };
}

// --- Response helpers ---

function response(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// --- Handler ---

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId ?? randomUUID();
  logger.appendKeys({ requestId });

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.body ?? '');
    } catch {
      return response(400, {
        error: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
        requestId,
      });
    }

    const input = validateRequest(parsed);

    logger.info('Creating item', { name: input.name });

    const item = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };

    // Persist to S3
    const bucketName = process.env.BUCKET_NAME!;
    const key = `items/${item.id}.json`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: JSON.stringify(item),
          ContentType: 'application/json',
        }),
      );
    } catch (error) {
      const classified = classifyS3Error(error);
      logger.error('Failed to persist item', {
        itemId: item.id,
        key,
        bucket: bucketName,
        errorCode: classified.code,
        isRetryable: classified.isRetryable,
      });
      throw classified;
    }

    logger.info('Item created and persisted', { itemId: item.id, key });

    return response(201, item);
  } catch (err) {
    if (err instanceof ValidationError) {
      return response(400, {
        error: 'VALIDATION_ERROR',
        message: err.message,
        requestId,
      });
    }

    logger.error('Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
    });

    return response(500, {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    });
  }
};
