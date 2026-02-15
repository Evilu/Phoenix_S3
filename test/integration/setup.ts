import {
  S3Client,
  CreateBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { beforeAll } from 'vitest';

const LOCALSTACK_ENDPOINT = 'http://localhost:4566';
const REGION = 'us-east-1';
const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

export const TEST_BUCKET = 'test-bucket';

export const s3Client = new S3Client({
  endpoint: LOCALSTACK_ENDPOINT,
  region: REGION,
  forcePathStyle: true,
  credentials: CREDENTIALS,
});

// Resolved from deployed stacks — set in beforeAll
export let apiBaseUrl = '';
export let deployedBucket = '';

async function getStackOutput(
  stackName: string,
  outputKey: string,
): Promise<string> {
  const cfn = new CloudFormationClient({
    endpoint: LOCALSTACK_ENDPOINT,
    region: REGION,
    credentials: CREDENTIALS,
  });

  const { Stacks } = await cfn.send(
    new DescribeStacksCommand({ StackName: stackName }),
  );

  const value = Stacks?.[0]?.Outputs?.find(
    (o) => o.OutputKey === outputKey,
  )?.OutputValue;

  if (!value) {
    throw new Error(
      `Stack output ${stackName}.${outputKey} not found. Run: npm run local:deploy`,
    );
  }

  return value;
}

beforeAll(async () => {
  // Create test bucket for raw S3 tests
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (
      error.name !== 'BucketAlreadyOwnedByYou' &&
      error.name !== 'BucketAlreadyExists'
    ) {
      throw err;
    }
  }

  // Resolve deployed stack outputs for pipeline tests
  try {
    apiBaseUrl = await getStackOutput('ApiStack', 'ApiUrl');
    deployedBucket = await getStackOutput('StorageStack', 'BucketName');
  } catch {
    // Stacks not deployed — pipeline tests will be skipped
    apiBaseUrl = '';
    deployedBucket = '';
  }
});
