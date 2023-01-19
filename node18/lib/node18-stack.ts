import * as cdk from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Node18Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'Queue', {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const fn = new NodejsFunction(this, 'MyFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: './src/index.ts',
      environment: {
        SQS_QUEUE_URL: queue.queueUrl,
      },
    });

    queue.grantSendMessages(fn);
  }
}
