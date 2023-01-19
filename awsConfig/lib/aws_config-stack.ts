import * as cdk from 'aws-cdk-lib';
import { ManagedRule, ManagedRuleIdentifiers } from 'aws-cdk-lib/aws-config';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsConfigStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ManagedRule(this, 'Ec2VolumeInUse', {
      identifier: ManagedRuleIdentifiers.EC2_VOLUME_INUSE_CHECK,
    });
  }
}
