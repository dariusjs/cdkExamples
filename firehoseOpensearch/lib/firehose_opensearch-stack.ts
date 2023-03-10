import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as firehose from '@aws-cdk/aws-kinesisfirehose-alpha';
import * as destinations from '@aws-cdk/aws-kinesisfirehose-destinations-alpha';
import * as path from 'path';

export class FirehoseOpensearchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var sourceAccount = process.env.SOURCE_ACCOUNT as string;

    const vpc = cdk.aws_ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    });

    const bucket = new cdk.aws_s3.Bucket(this, 'firehose-bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.aws_ec2.InterfaceVpcEndpoint(this, 'VPC Endpoint', {
      vpc,
      service: cdk.aws_ec2.InterfaceVpcEndpointAwsService.KINESIS_FIREHOSE,
    });

    const hose = new firehose.DeliveryStream(this, 'Delivery Stream', {
      destinations: [new destinations.S3Bucket(bucket)],
      deliveryStreamName: 'firehose',
    });

    const assumeLambdaRole = new cdk.aws_iam.Role(this, 'FireHoseLambdaRole', {
      assumedBy: new cdk.aws_iam.AccountPrincipal(sourceAccount),
      roleName: 'assumeFireHoseRole',
    });
    assumeLambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonKinesisFirehoseFullAccess',
      ),
    );

    const cfnCollection = new cdk.aws_opensearchserverless.CfnCollection(
      this,
      'MyCfnCollection',
      {
        name: 'name',

        // the properties below are optional
        description: 'description',
        tags: [
          {
            key: 'key',
            value: 'value',
          },
        ],
        type: 'type',
      },
    );
  }
}
