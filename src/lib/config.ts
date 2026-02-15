import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';

export interface AppConfig {
  bucketName: string;
  region: string;
  isLocal: boolean;
  localstackEndpoint: string;
}

async function resolveBucketName(
  isLocal: boolean,
  endpoint: string,
  region: string,
): Promise<string> {
  const cfn = isLocal
    ? new CloudFormationClient({
        endpoint,
        region,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      })
    : new CloudFormationClient({ region });

  const { Stacks } = await cfn.send(
    new DescribeStacksCommand({ StackName: 'StorageStack' }),
  );

  const output = Stacks?.[0]?.Outputs?.find(
    (o) => o.OutputKey === 'BucketName',
  );

  if (!output?.OutputValue) {
    throw new Error(
      'Could not resolve bucket name from StorageStack outputs. ' +
        'Either set BUCKET_NAME env var or deploy with: npm run local:deploy',
    );
  }

  return output.OutputValue;
}

export async function loadConfig(): Promise<AppConfig> {
  const isLocal = Boolean(
    process.env.LOCALSTACK_HOSTNAME || process.env.IS_LOCAL,
  );

  const localstackHost = process.env.LOCALSTACK_HOSTNAME ?? 'localhost';
  const localstackEndpoint = `http://${localstackHost}:4566`;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  const bucketName =
    process.env.BUCKET_NAME ??
    (await resolveBucketName(isLocal, localstackEndpoint, region));

  return {
    bucketName,
    region,
    isLocal,
    localstackEndpoint,
  };
}
