#!/usr/bin/env node

/**
 * Reads the Swagger spec from S3 and imports it into API Gateway.
 * This implements the requirement: "import the Swagger definition from S3 into API Gateway."
 *
 * Usage: node scripts/import-swagger-from-s3.mjs <bucket> <key> <api-id>
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  APIGatewayClient,
  PutRestApiCommand,
} from '@aws-sdk/client-api-gateway';

const [bucket, key, apiId] = process.argv.slice(2);

if (!bucket || !key || !apiId) {
  console.error(
    'Usage: node scripts/import-swagger-from-s3.mjs <bucket> <s3-key> <api-id>',
  );
  process.exit(1);
}

const region = process.env.AWS_REGION ?? 'us-east-1';

// 1. Read spec from S3
const s3 = new S3Client({ region });
const s3Response = await s3.send(
  new GetObjectCommand({ Bucket: bucket, Key: key }),
);
const specBody = await s3Response.Body.transformToByteArray();

console.log(`Read spec from s3://${bucket}/${key} (${specBody.length} bytes)`);

// 2. Import into API Gateway
const apigw = new APIGatewayClient({ region });
await apigw.send(
  new PutRestApiCommand({
    restApiId: apiId,
    mode: 'overwrite',
    body: specBody,
  }),
);

console.log(`Swagger spec imported into API Gateway (${apiId})`);
