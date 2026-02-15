export class S3OperationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'S3OperationError';
  }
}

const RETRYABLE_CODES = new Set([
  'SlowDown',
  'ServiceUnavailable',
  'InternalError',
  'RequestTimeout',
  'RequestTimeoutException',
  'ThrottlingException',
  'TooManyRequestsException',
]);

const CODE_MESSAGES: Record<string, string> = {
  NoSuchBucket: 'Bucket does not exist',
  NoSuchKey: 'Object key does not exist',
  AccessDenied: 'Insufficient permissions — check IAM policy',
  InvalidBucketName: 'Invalid bucket name format',
  EntityTooLarge: 'File exceeds maximum upload size',
  InvalidObjectState: 'Object is archived — restore before accessing',
};

export function classifyS3Error(error: unknown): S3OperationError {
  const err = error as Record<string, unknown>;
  const code = (err.name as string) ?? (err.Code as string) ?? 'Unknown';
  const metadata = err.$metadata as Record<string, unknown> | undefined;

  return new S3OperationError(
    CODE_MESSAGES[code] ?? `S3 operation failed: ${(err.message as string) ?? code}`,
    code,
    RETRYABLE_CODES.has(code),
    metadata?.httpStatusCode as number | undefined,
  );
}
