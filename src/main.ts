import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

interface EndPointConfig {
  readonly spacetraders: string;
  readonly openweather: string;
}

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const environment: string = process.env.ENV_NAME || 'development';
    const envConfig: EndPointConfig = scope.node.tryGetContext(environment);

    new lambda.NodejsFunction(this, 'MyFunction', {
      entry: './functions/hello/index.ts',
      environment: {
        SPACETRADERS_API: envConfig.spacetraders,
        OPENWEATHER_API: envConfig.openweather,
      },
      handler: 'index.handler',
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'my-stack-dev', { env: devEnv });

app.synth();
