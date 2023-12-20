import * as cdk from 'aws-cdk-lib';
import { ExecSyncOptions, execSync } from 'child_process';
import * as go from '@aws-cdk/aws-lambda-go-alpha';
import { Construct } from 'constructs';
import path = require('path');
import * as os from 'os';

export class GoAl2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const assetPath = path.join(__dirname, '../src');
    const buildPath = path.join(__dirname, '../_build');
    const applicationName1 = 'helloWorld1';
    const applicationName2 = 'helloWorld2';
    const applicationName3 = 'helloWorld3';
    const handlerName = 'bootstrap';

    const environment: Record<string, string> = {
      GO111MODULE: 'on',
      GOARCH: 'amd64',
      GOOS: 'linux',
    };

    try {
      execSync(`mkdir -p ${buildPath}/${applicationName1}/`);
      execSync(`mkdir -p ${buildPath}/${applicationName2}/`);
    } catch (error) {
      console.error('Unable to Create Build Directory: ' + error);
    }
    const al2function = new cdk.aws_lambda.Function(this, 'al2Function', {
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2,
      handler: handlerName,
      timeout: cdk.Duration.seconds(15),
      architecture: cdk.aws_lambda.Architecture.X86_64,
      code: cdk.aws_lambda.Code.fromAsset(assetPath, {
        bundling: {
          image: cdk.aws_lambda.Runtime.PROVIDED_AL2.bundlingImage,
          workingDirectory: `${buildPath}/${applicationName1}/`,
          outputType: cdk.BundlingOutput.AUTO_DISCOVER,
          local: {
            tryBundle: (outputDir: string): boolean => {
              console.log('Start Local Building.');
              console.log(assetPath);
              console.log(buildPath);
              if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
                console.warn('Linux and Mac supported Only.');
              }
              const execOptions: ExecSyncOptions = {
                stdio: ['ignore', process.stderr, 'inherit'],
              };
              try {
                execSync(
                  `cp ${assetPath}/${applicationName1}/* ${buildPath}/${applicationName1}/ `,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cd ${buildPath}/${applicationName1}/ && go build -tags lambda.norpc -o ${handlerName} main.go`,
                  {
                    env: { ...process.env, ...(environment ?? {}) },
                    ...execOptions,
                  },
                );
                execSync(
                  `cp ${buildPath}/${applicationName1}/${handlerName} ${outputDir}`,
                  {
                    ...execOptions,
                  },
                );
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

    const al2023function = new cdk.aws_lambda.Function(this, 'al2023Function', {
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2023,
      handler: handlerName,
      timeout: cdk.Duration.seconds(15),
      architecture: cdk.aws_lambda.Architecture.X86_64,
      code: cdk.aws_lambda.Code.fromAsset(assetPath, {
        bundling: {
          image: cdk.aws_lambda.Runtime.PROVIDED_AL2023.bundlingImage,
          workingDirectory: `${buildPath}/${applicationName2}/`,
          outputType: cdk.BundlingOutput.AUTO_DISCOVER,
          local: {
            tryBundle: (outputDir: string): boolean => {
              console.log('Start Local Building.');
              console.log(assetPath);
              console.log(buildPath);
              if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
                console.warn('Linux and Mac supported Only.');
              }
              const execOptions: ExecSyncOptions = {
                stdio: ['ignore', process.stderr, 'inherit'],
              };
              try {
                execSync(
                  `cp ${assetPath}/${applicationName2}/* ${buildPath}/${applicationName2}/ `,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cd ${buildPath}/${applicationName2}/ && go build -tags lambda.norpc -o ${handlerName} main.go`,
                  {
                    env: { ...process.env, ...(environment ?? {}) },
                    ...execOptions,
                  },
                );
                execSync(
                  `cp ${buildPath}/${applicationName2}/${handlerName} ${outputDir}`,
                  {
                    ...execOptions,
                  },
                );
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

    // Using Alpha Module
    new go.GoFunction(this, 'handler', {
      entry: `src/${applicationName3}`,
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2,
    });
  }
}
