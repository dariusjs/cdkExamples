import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class EksAwsHealthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new cdk.aws_eks.Cluster(this, 'HelloEKS', {
      clusterName: 'test',
      version: cdk.aws_eks.KubernetesVersion.V1_24,
      defaultCapacity: 0,
      tags: {
        'auto-delete': 'no',
      },
    });
    cdk.Tags.of(cluster).add(`auto-delete`, 'no');

    const rule = new cdk.aws_events.Rule(this, 'rule', {
      eventPattern: {
        source: ['aws.health'],
      },
    });

    const bucket = new cdk.aws_s3.Bucket(this, 'Bucket');

    // IAM role with permissions for firehose to write to s3 bucket
    const firehoseRole = new cdk.aws_iam.Role(this, 'firehoseRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('firehose.amazonaws.com'),
    });
    firehoseRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        actions: ['s3:ListBucket', 's3:PutObject'],
      }),
    );

    const stream = new cdk.aws_kinesisfirehose.CfnDeliveryStream(
      this,
      'Stream',
      {
        s3DestinationConfiguration: {
          bucketArn: bucket.bucketArn,
          bufferingHints: {
            intervalInSeconds: 60,
            sizeInMBs: 5,
          },
          // compressionFormat: 'GZIP',
          roleArn: firehoseRole.roleArn,
        },
      },
    );

    rule.addTarget(new cdk.aws_events_targets.KinesisFirehoseStream(stream));
  }
}
