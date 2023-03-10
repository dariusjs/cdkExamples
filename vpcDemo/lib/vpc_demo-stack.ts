import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class VpcDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new cdk.aws_ec2.Vpc(this, 'VPC', {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr('10.0.0.0/16'),
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'applicationA',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'applicationB',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
        {
          name: 'database001',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const s3GatewayEndpoint = new cdk.aws_ec2.GatewayVpcEndpoint(
      this,
      'S3GatewayEndpoint',
      {
        vpc,
        service: cdk.aws_ec2.GatewayVpcEndpointAwsService.S3,
      },
    );

    const ec2Instance = new cdk.aws_ec2.Instance(this, 'EC2Instance', {
      vpc,
      vpcSubnets: {
        subnetGroupName: 'applicationB',
        availabilityZones: ['us-east-1a'],
      },
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T4G,
        cdk.aws_ec2.InstanceSize.SMALL,
      ),

      machineImage: new cdk.aws_ec2.AmazonLinuxImage({
        generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: cdk.aws_ec2.AmazonLinuxCpuType.ARM_64,
      }),
      associatePublicIpAddress: false,
    });

    const ec2Instance2 = new cdk.aws_ec2.Instance(this, 'EC2Instance2', {
      vpc,
      vpcSubnets: {
        subnetGroupName: 'applicationB',
        availabilityZones: ['us-east-1b'],
      },
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T4G,
        cdk.aws_ec2.InstanceSize.SMALL,
      ),

      machineImage: new cdk.aws_ec2.AmazonLinuxImage({
        generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: cdk.aws_ec2.AmazonLinuxCpuType.ARM_64,
      }),
      associatePublicIpAddress: false,
    });

    ec2Instance.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:*'],
        resources: ['*'],
        effect: cdk.aws_iam.Effect.ALLOW,
      }),
    );

    ec2Instance2.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:*'],
        resources: ['*'],
        effect: cdk.aws_iam.Effect.ALLOW,
      }),
    );
    cdk.Tags.of(ec2Instance).add('auto-delete', 'no');

    const secGroup = new cdk.aws_ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow ssh access to ec2 instances',
      allowAllOutbound: true,
    });
    secGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(22),
      'allow ssh access',
    );
    ec2Instance.addSecurityGroup(secGroup);
    ec2Instance2.addSecurityGroup(secGroup);

    const clusterAdmin = new cdk.aws_iam.Role(this, 'EksClusterAdmin', {
      assumedBy: new cdk.aws_iam.AccountRootPrincipal(),
      roleName: 'EksClusterAdminTest',
    });
    const clusterAdminTest2 = new cdk.aws_iam.Role(
      this,
      'EksClusterAdminTest2',
      {
        assumedBy: new cdk.aws_iam.AccountRootPrincipal(),
        roleName: 'EksClusterAdminTest2',
      },
    );
    const eksCluster = new cdk.aws_eks.Cluster(this, 'EKSCluster', {
      vpc,
      clusterName: 'test',
      mastersRole: clusterAdmin,
      defaultCapacity: 0,
      version: cdk.aws_eks.KubernetesVersion.V1_24,
      vpcSubnets: [{ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });
    eksCluster.awsAuth.addMastersRole(clusterAdmin);
    cdk.Tags.of(eksCluster).add('auto-delete', 'no');
  }
}
