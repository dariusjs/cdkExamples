import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AsgPpsMonitorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new cdk.aws_ec2.Vpc(this, 'vpc', {});

    // iam role with managed policy SSM
    const role = new cdk.aws_iam.Role(this, 'InstanceSSM', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'CloudWatchAgentServerPolicy',
      ),
    );
    role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonSSMManagedInstanceCore',
      ),
    );

    const instanceInit = cdk.aws_ec2.CloudFormationInit.fromElements(
      cdk.aws_ec2.InitCommand.shellCommand(
        'yum install -y  git amazon-cloudwatch-agent',
      ),
      cdk.aws_ec2.InitFile.fromString(
        '/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json',
        `{
          "agent": {
                  "run_as_user": "cwagent",
                  "metrics_collection_interval": 60
          },
          "metrics": {
                    "metrics_collected": {
                      "mem": {
                              "measurement": [
                                      "mem_used_percent"
                              ]
                      },
                      "ethtool": {
                        "metrics_include": [
                          "rx_packets",
                          "tx_packets",
                          "bw_in_allowance_exceeded",
                          "bw_out_allowance_exceeded",
                          "conntrack_allowance_exceeded",
                          "linklocal_allowance_exceeded",
                          "pps_allowance_exceeded"
                        ]
                      }
                  },
                  "append_dimensions": {
                          "ImageId": "\${aws:ImageId}",
                          "InstanceId": "\${aws:InstanceId}",
                          "InstanceType": "\${aws:InstanceType}",
                          "AutoScalingGroupName": "\${aws:AutoScalingGroupName}"
                  }
          }
        }`,
      ),
      cdk.aws_ec2.InitCommand.shellCommand(
        'amazon-cloudwatch-agent-ctl -a stop',
      ),
      cdk.aws_ec2.InitCommand.shellCommand(
        'amazon-cloudwatch-agent-ctl -a start',
      ),
    );

    const multipartUserData = new cdk.aws_ec2.MultipartUserData();
    const commandsUserData = cdk.aws_ec2.UserData.forLinux();
    multipartUserData.addUserDataPart(
      commandsUserData,
      cdk.aws_ec2.MultipartBody.SHELL_SCRIPT,
      true,
    );

    multipartUserData.addCommands('sleep 60');
    commandsUserData.addCommands('yum clean all');
    commandsUserData.addCommands('yum groupinstall -y "Development Tools"');
    commandsUserData.addCommands('yum install -y  git amazon-cloudwatch-agent');
    commandsUserData.addCommands('cd /usr/local/');
    commandsUserData.addCommands(
      'git clone https://git.code.sf.net/p/iperf2/code iperf2-code',
    );
    commandsUserData.addCommands(
      'cd /usr/local/iperf2-code; ./configure; make; make install',
    );
    // commandsUserData.addCommands('yum install -y amazon-cloudwatch-agent');
    // commandsUserData.addCommands('amazon-cloudwatch-agent-ctl -a stop');
    // commandsUserData.addCommands(
    //   'echo \'{"agent":{"run_as_user":"cwagent"},"metrics":{"metrics_collected":{"ethtool":{"metrics_include":["rx_packets","tx_packets","bw_in_allowance_exceeded","bw_out_allowance_exceeded","conntrack_allowance_exceeded","linklocal_allowance_exceeded","pps_allowance_exceeded"]}},"append_dimensions":{"ImageId":" ${aws:ImageId}","InstanceId":" ${aws:InstanceId}","InstanceType":" ${aws:InstanceType}","AutoScalingGroupName":" ${aws:AutoScalingGroupName}"}}}\' > /tmp/bla.json',
    // );
    // commandsUserData.addCommands('amazon-cloudwatch-agent-ctl -a start');

    const emitInstance = new cdk.aws_ec2.Instance(this, 'instance', {
      vpc,
      instanceType: new cdk.aws_ec2.InstanceType('c5n.4xlarge'),
      machineImage: new cdk.aws_ec2.AmazonLinuxImage({
        generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      userData: multipartUserData,
      role: role,
      init: instanceInit,
    });

    // define security group that allows all outbound traffic and  inbound allows all tcp traffic from emitInstance
    const securityGroup = new cdk.aws_ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'allowAll',
      description: 'allow all traffic',
    });
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(5001),
      'allow test port tcp',
    );
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.udp(5001),
      'allow test port udp',
    );
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.allTcp(),
    );

    const launchTemplate = new cdk.aws_ec2.LaunchTemplate(
      this,
      'LaunchTemplate',
      {
        instanceType: new cdk.aws_ec2.InstanceType('t3.nano'),
        machineImage: new cdk.aws_ec2.AmazonLinuxImage({
          generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
        }),
        userData: multipartUserData,
        role: role,
        detailedMonitoring: true,
        requireImdsv2: true,
        securityGroup: emitInstance.connections.securityGroups[0],
      },
    );

    const asg = new cdk.aws_autoscaling.AutoScalingGroup(this, 'asg', {
      vpc,
      ssmSessionPermissions: true,
      minCapacity: 1,
      desiredCapacity: 1,
      capacityRebalance: true,
      maxCapacity: 10,
      launchTemplate: launchTemplate,
      init: instanceInit,
      signals: cdk.aws_autoscaling.Signals.waitForAll({
        timeout: cdk.Duration.minutes(10),
      }),
    });

    // scale asg with scaleOnCpuUtilization
    asg.scaleOnCpuUtilization('cpu', {
      targetUtilizationPercent: 50,
      cooldown: cdk.Duration.minutes(2),
      estimatedInstanceWarmup: cdk.Duration.minutes(5),
    });

    // scale asg with scaleOnIncomingBytes
    asg.scaleOnIncomingBytes('incomingBytes', {
      // targetBytesPerSecond as 500Mbit/s
      targetBytesPerSecond: 500000000,
      cooldown: cdk.Duration.minutes(2),
    });

    asg.scaleToTrackMetric('memoryMetric', {
      targetValue: 90,
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'CWAgent',
        metricName: 'mem_used_percent',
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
        dimensionsMap: {
          Name: asg.autoScalingGroupName,
          AutoScalingGroupName: asg.autoScalingGroupName,
        },
      }),
      cooldown: cdk.Duration.minutes(2),
    });

    // // create Cfn asg scaling based on ethtool_pps_allowance_exceeded
    // // Needs METRICS to be implemented on https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-autoscaling-scalingpolicy-targettrackingconfiguration.html
    // const cfnScaling = new cdk.aws_autoscaling.CfnScalingPolicy(
    //   this,
    //   'cfnScaling',
    //   {
    //     autoScalingGroupName: asg.autoScalingGroupName,
    //     policyType: 'TargetTrackingScaling',

    //     targetTrackingConfiguration: {
    //       targetValue: 10,

    //       customizedMetricSpecification: {
    //         metricName: 'ethtool_pps_allowance_exceeded',
    //         namespace: 'CWAgent',
    //         statistic: 'Average',

    //         dimensions: [
    //           {
    //             name: 'AutoScalingGroupName',
    //             value: asg.autoScalingGroupName,
    //           },
    //         ],
    //         // unit: 'unit',
    //       },
    //       disableScaleIn: false,
    //     },
    //   },
    // );
  }
}

// RATE(METRICS()) https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-network-performance.html
// SELECT AVG(ethtool_pps_allowance_exceeded) FROM SCHEMA(CWAgent, AutoScalingGroupName,ImageId,InstanceId,InstanceType,driver,interface) WHERE AutoScalingGroupName = 'AsgPpsMonitorStack-asgASG4D014670-8pMT1a3VIdL4'
// https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-target-tracking-metric-math.html
// https://github.com/aws/aws-cdk/issues/20659
