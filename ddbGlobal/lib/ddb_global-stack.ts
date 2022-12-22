import * as cdk from 'aws-cdk-lib';
import {
  Table,
  AttributeType,
  BillingMode,
  CfnGlobalTable,
} from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  AwsSdkCall,
  PhysicalResourceId,
  AwsCustomResource,
  AwsCustomResourcePolicy,
} from 'aws-cdk-lib/custom-resources';
import { Construct, DependencyGroup, IDependable } from 'constructs';

export class DdbGlobalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // L2 Broken Example
    this.createDdbGlobalL2();

    // // CFN Method
    // this.createDdbGlobalCfn();
  }

  private createDdbGlobalL2() {
    const globalTable = new Table(this, 'Table', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      replicationRegions: ['us-east-1', 'eu-west-1'],
      billingMode: BillingMode.PROVISIONED,
    });

    globalTable
      .autoScaleWriteCapacity({
        minCapacity: 20,
        maxCapacity: 25,
      })
      .scaleOnUtilization({
        targetUtilizationPercent: 75,
      });
    globalTable
      .autoScaleReadCapacity({
        minCapacity: 20,
        maxCapacity: 25,
      })
      .scaleOnUtilization({
        targetUtilizationPercent: 75,
      });

    const updateTableSettings: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'updateTableReplicaAutoScaling',
      parameters: {
        ProvisionedWriteCapacityAutoScalingUpdate: {
          MinimumUnits: 30,
          MaximumUnits: 35,
          ScalingPolicyUpdate: {
            TargetTrackingScalingPolicyConfiguration: {
              ScaleInCooldown: 10,
              ScaleOutCooldown: 10,
              TargetValue: 75,
            },
          },
        },
        ReplicaUpdates: [
          {
            RegionName: 'eu-west-1',
            ReplicaProvisionedReadCapacityAutoScalingUpdate: {
              MinimumUnits: 20,
              MaximumUnits: 25,
              ScalingPolicyUpdate: {
                TargetTrackingScalingPolicyConfiguration: {
                  ScaleInCooldown: 10,
                  ScaleOutCooldown: 10,
                  TargetValue: 75,
                },
              },
            },
          },
        ],
        TableName: globalTable.tableName,
      },
      outputPaths: ['Contents.0.Key'],
      physicalResourceId: PhysicalResourceId.of('id'),
    };

    const enableTableSettings = new AwsCustomResource(this, 'customResource', {
      onCreate: updateTableSettings,
      onUpdate: updateTableSettings,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    enableTableSettings.grantPrincipal.addToPrincipalPolicy(
      new PolicyStatement({
        // Tech debt!
        // need to add the proper resource of the auto scaling item for dynamodb
        resources: ['*'],
        actions: ['application-autoscaling:DeleteScalingPolicy'],
      }),
    );

    // # unresolved dependencies caused by the required scaling settings
    // enableTableSettings.node.addDependency(globalTable);
  }

  private createDdbGlobalCfn() {
    new CfnGlobalTable(this, 'MyCfnGlobalTable', {
      tableName: 'cfnGlobalTable',
      attributeDefinitions: [
        {
          attributeName: 'PK',
          attributeType: 'S',
        },
      ],
      keySchema: [
        {
          attributeName: 'PK',
          keyType: 'HASH',
        },
      ],
      replicas: [
        {
          region: 'us-east-1',
          readProvisionedThroughputSettings: {
            readCapacityAutoScalingSettings: {
              minCapacity: 20,
              maxCapacity: 25,
              targetTrackingScalingPolicyConfiguration: {
                targetValue: 15,
              },
            },
          },
        },
        {
          region: 'eu-west-1',
          readProvisionedThroughputSettings: {
            readCapacityAutoScalingSettings: {
              maxCapacity: 15,
              minCapacity: 15,
              targetTrackingScalingPolicyConfiguration: {
                targetValue: 15,
              },
            },
          },
        },
      ],

      billingMode: BillingMode.PROVISIONED,
      streamSpecification: {
        streamViewType: 'NEW_AND_OLD_IMAGES',
      },
      writeProvisionedThroughputSettings: {
        writeCapacityAutoScalingSettings: {
          maxCapacity: 10,
          minCapacity: 10,
          targetTrackingScalingPolicyConfiguration: {
            targetValue: 10,
          },
        },
      },
    });
  }
}
