import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BoundaryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    var sourceAccount = process.env.SOURCE_ACCOUNT as string;

    const boundary = new cdk.aws_iam.ManagedPolicy(this, 'Boundary2', {
      statements: [
        new cdk.aws_iam.PolicyStatement({
          effect: cdk.aws_iam.Effect.ALLOW,
          actions: ['ec2:DeleteVolume', 'ec2:DeleteSnapshot'],
          resources: ['*'],
          conditions: {
            'ForAnyValue:StringLike': {
              'ec2:ResourceTag/ebs.csi.aws.com/cluster': 'true',
            },
          },
        }),
      ],
    });
    boundary.addStatements(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['ec2:DeleteVolume'],
        resources: ['*'],
        conditions: {
          'ForAnyValue:StringLike': {
            'ec2:ResourceTag/CSIVolumeName': '*',
          },
        },
      }),
    );
    boundary.addStatements(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['ec2:DeleteVolume'],
        resources: ['*'],
        conditions: {
          'ForAnyValue:StringLike': {
            'ec2:ResourceTag/kubernetes.io/created-for/pvc/name': '*',
          },
        },
      }),
    );
    boundary.addStatements(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['ec2:DeleteVolume'],
        resources: ['*'],
        conditions: {
          'ForAnyValue:StringLike': {
            'ec2:ResourceTag/CSIVolumeSnapshotName': '*',
          },
        },
      }),
    );

    const operatorRole = new cdk.aws_iam.Role(this, 'Role', {
      assumedBy: new cdk.aws_iam.AccountPrincipal(sourceAccount),
      roleName: 'TestBoundaryRole',
      permissionsBoundary: boundary,
    });

    operatorRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        resources: ['*'],
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['ec2:DeleteVolume'],
      }),
    );
  }
}
