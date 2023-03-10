import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path = require('path');

export class FastapiStreamingFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const domainName = 'fastapi.example.com';
    // const domainZone = cdk.aws_route53.HostedZone.fromLookup(this, 'Zone', {
    //   domainName: 'example.com',
    // });

    // const certificate =
    //   cdk.aws_certificatemanager.Certificate.fromCertificateArn(
    //     this,
    //     'Cert',
    //     `arn:aws:acm:us-east-1:${process.env.CDK_DEFAULT_ACCOUNT}:certificate/${process.env.CERT_ID}`,
    //   );

    const cluster = new cdk.aws_ecs.Cluster(this, 'Cluster', {});

    const asset = new cdk.aws_ecr_assets.DockerImageAsset(
      this,
      'FastApiBuildImage',
      {
        directory: path.join(__dirname, '../src'),
        platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64,
      },
    );

    const loadBalancedFargateService =
      new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        'Service',
        {
          cluster,
          memoryLimitMiB: 1024,
          cpu: 512,
          taskImageOptions: {
            image: cdk.aws_ecs.ContainerImage.fromDockerImageAsset(asset),
            containerPort: 80,
          },
          // certificate,
          // sslPolicy: cdk.aws_elasticloadbalancingv2.SslPolicy.RECOMMENDED,
          // domainName: domainName,
          // domainZone,
          // redirectHTTP: true,
        },
      );

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: '/',
    });
  }
}
