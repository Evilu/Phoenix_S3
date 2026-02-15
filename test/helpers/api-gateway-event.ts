import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export function createApiEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /items',
    rawPath: '/items',
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '000000000000',
      apiId: 'test-api',
      domainName: 'localhost',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: '/items',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: 'POST /items',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: null,
    isBase64Encoded: false,
    ...overrides,
  } as APIGatewayProxyEventV2;
}
