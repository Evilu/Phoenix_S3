export interface AppConfig {
  bucketName: string;
  region: string;
  isLocal: boolean;
  localstackEndpoint: string;
}

export function loadConfig(): AppConfig {
  const isLocal = Boolean(
    process.env.LOCALSTACK_HOSTNAME || process.env.IS_LOCAL,
  );

  const localstackHost = process.env.LOCALSTACK_HOSTNAME ?? 'localhost';
  const localstackEndpoint = `http://${localstackHost}:4566`;

  return {
    bucketName: process.env.BUCKET_NAME ?? 'dev-storage-bucket',
    region: process.env.AWS_REGION ?? 'us-east-1',
    isLocal,
    localstackEndpoint,
  };
}
