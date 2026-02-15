import { describe, it, expect } from 'vitest';
import { classifyS3Error, S3OperationError } from '@/lib/errors';

describe('classifyS3Error', () => {
  const testCases = [
    { code: 'NoSuchBucket', retryable: false, pattern: /does not exist/ },
    { code: 'NoSuchKey', retryable: false, pattern: /does not exist/ },
    { code: 'AccessDenied', retryable: false, pattern: /permissions/ },
    { code: 'SlowDown', retryable: true, pattern: /failed/ },
    { code: 'ServiceUnavailable', retryable: true, pattern: /failed/ },
    { code: 'InternalError', retryable: true, pattern: /failed/ },
    { code: 'UnknownError', retryable: false, pattern: /failed/ },
  ];

  testCases.forEach(({ code, retryable, pattern }) => {
    it(`should classify ${code} as ${retryable ? '' : 'non-'}retryable`, () => {
      const error = classifyS3Error({
        name: code,
        message: `AWS error: ${code}`,
        $metadata: { httpStatusCode: 500 },
      });

      expect(error).toBeInstanceOf(S3OperationError);
      expect(error.code).toBe(code);
      expect(error.isRetryable).toBe(retryable);
      expect(error.message).toMatch(pattern);
    });
  });

  it('should extract httpStatusCode from metadata', () => {
    const error = classifyS3Error({
      name: 'AccessDenied',
      message: 'Access Denied',
      $metadata: { httpStatusCode: 403 },
    });
    expect(error.statusCode).toBe(403);
  });

  it('should handle errors without metadata', () => {
    const error = classifyS3Error({
      name: 'NoSuchKey',
      message: 'Not found',
    });
    expect(error.code).toBe('NoSuchKey');
    expect(error.statusCode).toBeUndefined();
  });
});
