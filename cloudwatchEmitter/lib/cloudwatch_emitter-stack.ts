import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CloudwatchEmitterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var destination_account = process.env.DESTINATION_ACCOUNT;

    const logGroup = new cdk.aws_logs.LogGroup(this, 'LogGroup', {
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });
    const importedStream = cdk.aws_kinesis.Stream.fromStreamArn(
      this,
      'ImportedStream',
      `arn:aws:logs:us-east-1:${destination_account}:destination:cwlogsDestination`,
    );

    new cdk.aws_logs.SubscriptionFilter(this, 'Subscription', {
      logGroup,
      destination: new cdk.aws_logs_destinations.KinesisDestination(
        importedStream,
      ),
      filterPattern: cdk.aws_logs.FilterPattern.allTerms('ERROR', 'MainThread'),
      // filterName: 'ErrorInMainThread',
    });
  }
}
