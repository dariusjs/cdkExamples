import { aws_lambda, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as os from 'os';
import { execSync, ExecSyncOptions } from 'child_process';

export class LambdaDualArchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const assetPath = path.join(__dirname, '../function');
    const buildPath = '_build';
    const applicationName = 'helloWorld';
    try {
      execSync(`mkdir -p ${buildPath}/arm64/${applicationName}/`);
      execSync(`mkdir -p ${buildPath}/x86_64/${applicationName}/`);
    } catch (error) {
      console.error('Unable to Create Build Directory: ' + error);
    }
    new aws_lambda.Function(this, 'ArmFunction', {
      runtime: aws_lambda.Runtime.DOTNET_6,
      architecture: aws_lambda.Architecture.ARM_64,
      timeout: Duration.seconds(30),
      handler: `${applicationName}::${applicationName}.Function::FunctionHandler`,
      code: aws_lambda.Code.fromAsset(assetPath, {
        bundling: {
          image: aws_lambda.Runtime.DOTNET_6.bundlingImage,
          // workingDirectory: `${assetPath}/${buildPath}/${applicationName}/`,
          workingDirectory: `${assetPath}/${buildPath}/arm64/${applicationName}/`,
          local: {
            tryBundle: (outputDir: string): boolean => {
              console.log('Start Local Building.');
              if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
                console.warn('Linux and Mac supported Only.');
              }
              const execOptions: ExecSyncOptions = {
                stdio: ['ignore', process.stderr, 'inherit'],
              };
              try {
                execSync(
                  `cp ${assetPath}/${applicationName}/src/${applicationName}/* ${buildPath}/arm64/${applicationName}/ `,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cd ${buildPath}/arm64/${applicationName}; dotnet publish --output "publish/" --configuration "Release" --framework "net6.0" /p:GenerateRuntimeConfigurationFiles=true --runtime linux-arm64 --self-contained false`,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cp ${buildPath}/arm64/${applicationName}/publish/* ${outputDir}`,
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
    new aws_lambda.Function(this, 'x86Function', {
      runtime: aws_lambda.Runtime.DOTNET_6,
      architecture: aws_lambda.Architecture.X86_64,
      timeout: Duration.seconds(30),
      handler: `${applicationName}::${applicationName}.Function::FunctionHandler`,
      code: aws_lambda.Code.fromAsset(assetPath, {
        bundling: {
          image: aws_lambda.Runtime.DOTNET_6.bundlingImage,
          workingDirectory: `${assetPath}/${buildPath}/x86_64/${applicationName}/`,
          local: {
            tryBundle: (outputDir: string): boolean => {
              console.log('Start Local Building.');
              if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
                console.warn('Linux and Mac supported Only.');
              }
              const execOptions: ExecSyncOptions = {
                stdio: ['ignore', process.stderr, 'inherit'],
              };
              try {
                execSync(
                  `cp ${assetPath}/${applicationName}/src/${applicationName}/* ${buildPath}/x86_64/${applicationName}/ `,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cd ${buildPath}/x86_64/${applicationName}; dotnet publish --output "publish/" --configuration "Release" --framework "net6.0" /p:GenerateRuntimeConfigurationFiles=true --runtime linux-x64 --self-contained false`,
                  {
                    ...execOptions,
                  },
                );
                execSync(
                  `cp ${buildPath}/x86_64/${applicationName}/publish/* ${outputDir}`,
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
  }
}
