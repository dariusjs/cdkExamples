import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class GetFromSecretsManagerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'MyFunction', {
      entry: './src/index.ts',
      handler: 'handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_14_X,
    });
    const secret = cdk.aws_secretsmanager.Secret.fromSecretNameV2(
      this,
      'SecretFromName',
      'forty/two',
    );
    secret.grantRead(fn);
  }
}
