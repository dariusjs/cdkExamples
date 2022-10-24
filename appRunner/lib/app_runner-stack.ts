import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';

export class AppRunnerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var CONNECTION_ARN = process.env.CONNECTION_ARN as string;

    new apprunner.Service(this, 'github-service', {
      source: apprunner.Source.fromGitHub({
        repositoryUrl: 'https://github.com/aws-containers/hello-app-runner',
        branch: 'main',
        configurationSource: apprunner.ConfigurationSourceType.API,
        codeConfigurationValues: {
          runtime: apprunner.Runtime.PYTHON_3,
          port: '8000',
          startCommand: 'python app.py',
          buildCommand:
            'sleep 1500; yum install -y pycairo && pip install -r requirements.txt',
        },
        connection:
          apprunner.GitHubConnection.fromConnectionArn(CONNECTION_ARN),
      }),
    });
  }
}
