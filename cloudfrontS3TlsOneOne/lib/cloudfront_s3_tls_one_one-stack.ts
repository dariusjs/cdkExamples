import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CloudfrontS3TlsOneOneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // cdk bucket that has a bucket policy enforcing TLS 1.2
    const bucket = new cdk.aws_s3.Bucket(this, 'Bucket', {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.DENY,
        resources: [
          `arn:aws:s3:::${bucket.bucketName}/*`,
          `arn:aws:s3:::${bucket.bucketName}`,
        ],
        actions: ['s3:*'],
        principals: [new cdk.aws_iam.AnyPrincipal()],
        conditions: {
          NumericLessThan: {
            's3:TlsVersion': 1.2,
          },
        },
      }),
    );

    new cdk.aws_cloudfront.Distribution(this, 'myDist', {
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(bucket),
        viewerProtocolPolicy:
          cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      minimumProtocolVersion:
        cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2016,
    });
  }
}
