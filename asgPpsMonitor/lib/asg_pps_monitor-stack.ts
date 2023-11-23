import * as cdk from 'aws-cdk-lib';
import { UserData } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

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
    commandsUserData.addCommands('yum install -y amazon-cloudwatch-agent');
    commandsUserData.addCommands('amazon-cloudwatch-agent-ctl -a stop');
    commandsUserData.addCommands(
      'echo \'{"agent":{"run_as_user":"cwagent"},"metrics":{"metrics_collected":{"ethtool":{"metrics_include":["rx_packets","tx_packets","bw_in_allowance_exceeded","bw_out_allowance_exceeded","conntrack_allowance_exceeded","linklocal_allowance_exceeded","pps_allowance_exceeded"]}},"append_dimensions":{"ImageId":" ${aws:ImageId}","InstanceId":" ${aws:InstanceId}","InstanceType":" ${aws:InstanceType}","AutoScalingGroupName":" ${aws:AutoScalingGroupName}"}}}\' > /tmp/bla.json',
    );
    commandsUserData.addCommands('amazon-cloudwatch-agent-ctl -a start');

    const emitInstance = new cdk.aws_ec2.Instance(this, 'instance', {
      vpc,
      instanceType: new cdk.aws_ec2.InstanceType('c5n.4xlarge'),
      machineImage: new cdk.aws_ec2.AmazonLinuxImage({
        generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      userData: multipartUserData,
      role: role,
    });

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
      },
    );

    // create auto scaling group with 2 instances m6i
    const asg = new cdk.aws_autoscaling.AutoScalingGroup(this, 'asg', {
      vpc,
      ssmSessionPermissions: true,
      minCapacity: 1,
      desiredCapacity: 1,
      capacityRebalance: true,
      maxCapacity: 3,
      launchTemplate: launchTemplate,
      init: cdk.aws_ec2.CloudFormationInit.fromElements(
        cdk.aws_ec2.InitCommand.shellCommand(
          'yum install -y  git amazon-cloudwatch-agent',
        ),
        cdk.aws_ec2.InitFile.fromString(
          '/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json',
          `{
            "agent": {
                    "run_as_user": "cwagent"
            },
            "metrics": {
                      "metrics_collected": {
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
      ),
      signals: cdk.aws_autoscaling.Signals.waitForAll({
        timeout: cdk.Duration.minutes(10),
      }),
    });

    // create eventbridge rule that listens for ec2 instance  launches on autoscaling group
    const rule = new cdk.aws_events.Rule(this, 'rule', {
      eventPattern: {
        source: ['aws.autoscaling'],
        detailType: [
          'EC2 Instance Launch Successful',
          'EC2 Instance Terminate Successful',
        ],
        detail: {
          AutoScalingGroupName: [asg.autoScalingGroupName],
        },
      },
    });

    asg.scaleToTrackMetric('metric', {
      targetValue: 1,
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'CWAgent',
        metricName: 'ethtool_pps_allowance_exceeded',
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
        dimensionsMap: {
          AutoScalingGroupName: asg.autoScalingGroupName,
        },
      }),
      cooldown: cdk.Duration.minutes(1),
    });
  }
}
