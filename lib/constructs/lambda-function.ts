import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface ServiceFunctionProps {
  entry: string;
  handler?: string;
  memorySize?: number;
  timeoutSeconds?: number;
  environment?: Record<string, string>;
  description?: string;
}

export class ServiceFunction extends Construct {
  public readonly fn: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: ServiceFunctionProps) {
    super(scope, id);

    this.fn = new nodejs.NodejsFunction(this, 'Handler', {
      entry: props.entry,
      handler: props.handler ?? 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: props.memorySize ?? 256,
      timeout: cdk.Duration.seconds(props.timeoutSeconds ?? 30),
      tracing: lambda.Tracing.ACTIVE,
      description: props.description,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        ...props.environment,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        externalModules: [],
        format: nodejs.OutputFormat.ESM,
        mainFields: ['module', 'main'],
        banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    });
  }
}
