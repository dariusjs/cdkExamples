import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { execSync, ExecSyncOptions } from 'child_process';
import * as path from 'path';
import * as os from 'os';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const assetPath = path.join(__dirname, '../functions');
    const buildPath = '_build';
    const applicationName = 'helloWorld';
    try {
      execSync(`mkdir -p ${buildPath}/${applicationName}/`);
    } catch (error) {
      console.error('Unable to Create Build Directory: ' + error);
    }
    new Function(this, 'MyFunction', {
      runtime: Runtime.GO_1_X,
      handler: 'index.handler',
      code: Code.fromAsset(assetPath, {
        bundling: {
          image: Runtime.GO_1_X.bundlingImage,
          workingDirectory: `./${buildPath}/${applicationName}/`,
          local: {
            tryBundle: (outputDir: string): boolean => {
              console.log('Start Local Building.');
              if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
                console.warn('Linex and Mac supported Only.');
              }
              const execOptions: ExecSyncOptions = {
                stdio: ['ignore', process.stderr, 'inherit'],
              };
              try {
                execSync(`cp ${assetPath}/${applicationName}/* ${buildPath}/${applicationName}/ `, {
                  ...execOptions,
                });
                execSync(`cd _build/${applicationName}/; go build`, {
                  ...execOptions,
                });
                execSync(`cp _build/${applicationName}/${applicationName} ${outputDir}`, {
                  ...execOptions,
                });
              } catch (error) {
                console.error('Error during local bundling: ' + error);
                return false;
              }
              return true;
            },
          },
        },
      }),
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'my-stack-dev', { env: devEnv });

app.synth();
