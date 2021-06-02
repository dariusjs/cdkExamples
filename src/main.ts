import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

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

    // const environment: string = process.env.ENV_NAME || 'development';
    const envConfig: EndPointConfig = scope.node.tryGetContext(props.environment);

    console.log('ENV CONFIG IS: ', envConfig);
    console.log('props: ', props);

    // const spaceTraderEndpoint = envConfig.spacetraders;
    // const openWeatherEndpoint = envConfig.openweather;
    // console.log('spaceTraderEndpoint: ', spaceTraderEndpoint);
    // console.log('openWeatherEndpoint: ', openWeatherEndpoint);

    new lambda.NodejsFunction(this, 'MyFunction', {
      entry: './functions/hello/index.ts',
      environment: {
        // SPACETRADERS_API: spaceTraderEndpoint,
        // OPENWEATHER_API: openWeatherEndpoint,
      },
      handler: 'index.handler',
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
