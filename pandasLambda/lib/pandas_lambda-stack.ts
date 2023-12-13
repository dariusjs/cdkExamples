import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PandasLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pandasLayer =
      'arn:aws:lambda:us-east-1:336392948345:layer:AWSSDKPandas-Python311:4';

    const pandasLayerVersion = cdk.aws_lambda.LayerVersion.fromLayerVersionArn(
      this,
      'bleh',
      pandasLayer,
    );

    new cdk.aws_lambda.Function(this, 'PandasLambda', {
      code: cdk.aws_lambda.Code.fromAsset(path.join('./src/')),
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_11,
      handler: 'main.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      architecture: cdk.aws_lambda.Architecture.X86_64,
      layers: [pandasLayerVersion],
    });
  }
}
