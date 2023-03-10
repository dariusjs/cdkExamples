import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export class VpceFirehoseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var target_account = process.env.TARGET_ACCOUNT as string;

    const vpc = new cdk.aws_ec2.Vpc(this, 'TheVPC', {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr('10.0.0.0/16'),
    });

    const firehose_vpce = new cdk.aws_ec2.InterfaceVpcEndpoint(
      this,
      'VPC Endpoint',
      {
        vpc,
        service: cdk.aws_ec2.InterfaceVpcEndpointAwsService.KINESIS_FIREHOSE,
      },
    );

    const lambdaRole = new cdk.aws_iam.Role(this, 'FireHoseLambdaRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'lambdaToFireHoseRole',
    });
    lambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonKinesisFirehoseFullAccess',
      ),
    );
    lambdaRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${target_account}:role/assumeFireHoseRole`],
      }),
    );

    const fn = new cdk.aws_lambda.Function(this, 'MyFunction', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
      handler: 'main.lambda_handler',
      code: cdk.aws_lambda.Code.fromAsset(
        path.join(__dirname, '../src/firehose-operator'),
      ),
      vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      environment: {
        TARGET_ACCOUNT: target_account,
        FIREHOSE_URL: 'https://firehose.us-east-1.amazonaws.com',
      },
      role: lambdaRole,
    });
  }
}
