#!/usr/bin/env npx tsx
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/stacks/storage-stack.js';
import { ApiStack } from '../lib/stacks/api-stack.js';

const app = new cdk.App();

const isLocal =
  process.env.CDK_LOCAL === 'true' || process.env.LOCALSTACK === 'true';

const envConfig = isLocal
  ? { account: '000000000000', region: 'us-east-1' }
  : {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
    };

const storageStack = new StorageStack(app, 'StorageStack', {
  env: envConfig,
  isLocal,
});

new ApiStack(app, 'ApiStack', {
  env: envConfig,
  storageBucket: storageStack.bucket,
  isLocal,
});
