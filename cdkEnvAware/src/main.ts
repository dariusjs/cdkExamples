// import * as lambda from '@aws-cdk/aws-lambda-nodejs';
// import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { Stack, StackProps, App } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

import { Construct } from 'constructs';

interface EndPointConfig {
  readonly spacetraders: string;
  readonly openweather: string;
}

export interface IStackProps extends StackProps {
  environment: string;
}

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: IStackProps) {
    super(scope, id, props);

    const envConfig: EndPointConfig =
      scope.node.tryGetContext(props.environment) ?? {};

    const spaceTraderEndpoint =
      envConfig.spacetraders ?? 'https://somehwere.local';
    const openWeatherEndpoint =
      envConfig.openweather ?? 'https://overthere.local';

    new cdk.aws_lambda_nodejs.NodejsFunction(this, 'MyFunction', {
      entry: './functions/hello/index.ts',
      environment: {
        SPACETRADERS_API: spaceTraderEndpoint,
        OPENWEATHER_API: openWeatherEndpoint,
      },
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_14_X,
    });
  }
}

const app = new App();
const props = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  environment: app.node.tryGetContext('environment') ?? 'development',
};

new MyStack(app, 'my-stack-dev', { ...props });

app.synth();
