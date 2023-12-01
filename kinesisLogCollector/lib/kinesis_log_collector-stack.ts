import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class KinesisLogCollectorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var emit_account = process.env.EMIT_ACCOUNT;

    // create kinesis ondemand stream
    const kinesisStream = new cdk.aws_kinesis.Stream(this, 'KinesisStream', {
      streamMode: cdk.aws_kinesis.StreamMode.ON_DEMAND,
      retentionPeriod: cdk.Duration.days(7),
      streamName: 'kinesis-log-collector-stream',
    });

    // create IAM role with  trust policy for Cloudwatch Logs
    const role = new cdk.aws_iam.Role(this, 'CWLtoKinesisRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('logs.amazonaws.com'),
    });

    role.assumeRolePolicy?.addStatements(
      new cdk.aws_iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: cdk.aws_iam.Effect.ALLOW,
        conditions: {
          StringLike: {
            'aws:SourceArn': [
              `arn:aws:logs:region:${emit_account}:*`,
              `arn:aws:logs:region:${this.account}:*`,
            ],
          },
        },
        principals: [new cdk.aws_iam.ServicePrincipal('logs.amazonaws.com')],
      }),
    );

    role.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['kinesis:PutRecord'],
        resources: [`${kinesisStream.streamArn}`],
      }),
    );

    // const kinesisDestination = new Blah(
    const kinesisDestination = new cdk.aws_logs_destinations.KinesisDestination(
      kinesisStream,
      /* all optional props */ {
        role: role,
      },
    );

    const cfnDestination = new cdk.aws_logs.CfnDestination(
      this,
      'MyCfnDestination',
      {
        destinationName: 'cwlogsDestination',
        roleArn: role.roleArn,
        targetArn: kinesisStream.streamArn,

        // the properties below are optional
        destinationPolicy: `{
          "Version": "2012-10-17",
            "Statement": [
              {
                "Sid": "",
                "Effect": "Allow",
                "Principal": {
                  "AWS": "${emit_account}"
                },
                "Action": "logs:PutSubscriptionFilter",
                "Resource": "arn:aws:logs:us-east-1:${this.account}:destination:cwlogsDestination"
              }
            ]
        }`,
      },
    );

    cfnDestination.node.addDependency(role);
  }
}
