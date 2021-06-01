import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { MyStack } from '../src/main';

describe('CDK Tests', () => {
  beforeAll(() => {
    const env = process.env;
    env.ENVIRONMENT = 'development';
    env.CDK_CONTEXT_JSON =
      '{"development": { "spacetraders": "https://dev-api.spacetraders.io/game/status", "openweather": "https://dev-api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}"}}';
  });

  it('Snapshot', () => {
    const app = new App();
    const props = {
      env: {
        account: '12345678',
        region: 'down-under-1',
      },
      environment: 'development',
    };
    const stack = new MyStack(app, 'test', { ...props });

    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });
});
