import { Stack, StackProps } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class RedshiftStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, 'bucket', {
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      enforceSSL: true,
      publicReadAccess: false,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      versioned: true,
    });

    const redshiftRole = new cdk.aws_iam.Role(this, 'RedshiftRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('redshift.amazonaws.com'),
    });

    const cluster = new cdk.aws_redshift.CfnCluster(this, 'redshift', {
      clusterType: 'single',
      dbName: 'redshift',
      masterUsername: 'test',
      masterUserPassword: 'test',
      nodeType: 'test',
    });

    bucket.grantRead(redshiftRole);
  }
}
