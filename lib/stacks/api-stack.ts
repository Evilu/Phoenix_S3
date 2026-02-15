import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import { ServiceFunction } from '../constructs/lambda-function.js';

export interface ApiStackProps extends cdk.StackProps {
  storageBucket: s3.IBucket;
  isLocal?: boolean;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigw.SpecRestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Lambda: POST /items handler
    const createItemFn = new ServiceFunction(this, 'CreateItemFunction', {
      entry: resolve(__dirname, '../../src/handlers/create-item.ts'),
      description: 'Processes POST /items requests',
      environment: {
        BUCKET_NAME: props.storageBucket.bucketName,
        ...(props.isLocal
          ? { IS_LOCAL: 'true', LOCALSTACK_HOSTNAME: 'localstack' }
          : {}),
      },
    });

    // Grant the Lambda read/write access to the storage bucket
    props.storageBucket.grantReadWrite(createItemFn.fn);

    // Upload OpenAPI spec to S3 (Exercise 2 requirement)
    new s3deploy.BucketDeployment(this, 'DeployOpenApiSpec', {
      sources: [s3deploy.Source.asset(resolve(__dirname, '../../api'))],
      destinationBucket: props.storageBucket,
      destinationKeyPrefix: 'api-specs',
    });

    // Load and process the OpenAPI spec, substituting the Lambda ARN
    const specPath = resolve(__dirname, '../../api/openapi.yaml');
    const specString = readFileSync(specPath, 'utf-8');
    const specObject = yaml.load(specString) as Record<string, unknown>;

    // Replace the Lambda ARN placeholder in the spec
    const specJson = JSON.stringify(specObject).replace(
      /\$\{CreateItemFunctionArn\}/g,
      createItemFn.fn.functionArn,
    );

    this.api = new apigw.SpecRestApi(this, 'ItemsApi', {
      apiDefinition: apigw.ApiDefinition.fromInline(JSON.parse(specJson)),
      restApiName: 'items-api',
      deployOptions: {
        stageName: props.isLocal ? 'local' : 'v1',
        tracingEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    });

    // Grant API Gateway permission to invoke the Lambda
    createItemFn.fn.addPermission('ApiGwInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: this.api.arnForExecuteApi(),
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url ?? 'deployment-pending',
      description: 'API Gateway endpoint URL',
    });
  }
}
