import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class EksTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new cdk.aws_eks.Cluster(this, 'HelloEKS', {
      version: cdk.aws_eks.KubernetesVersion.V1_20,
      defaultCapacity: 0,
    });

    cluster.addNodegroupCapacity('on-demand-node-group', {
      instanceTypes: [
        new cdk.aws_ec2.InstanceType('m5.large'),
        new cdk.aws_ec2.InstanceType('m5a.large'),
        new cdk.aws_ec2.InstanceType('c5.large'),
        new cdk.aws_ec2.InstanceType('c5a.large'),
      ],
      minSize: 1,
      diskSize: 100,
      amiType: cdk.aws_eks.NodegroupAmiType.AL2_X86_64,
    });

    cluster.addNodegroupCapacity('spot-node-group', {
      instanceTypes: [
        new cdk.aws_ec2.InstanceType('m5.large'),
        new cdk.aws_ec2.InstanceType('m5a.large'),
        new cdk.aws_ec2.InstanceType('c5.large'),
        new cdk.aws_ec2.InstanceType('c5a.large'),
      ],
      minSize: 1,
      diskSize: 100,
      amiType: cdk.aws_eks.NodegroupAmiType.AL2_X86_64,
      capacityType: cdk.aws_eks.CapacityType.SPOT,
    });

    cluster.addManifest('pod', {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: 'pod' },
      spec: {
        containers: [
          {
            name: 'hello',
            image: 'tutum/hello-world',
            ports: [{ containerPort: 80 }],
          },
        ],
      },
    });
  }
}
