import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsInventoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create s3 bucket with default serverside encryption
    const inventoryBucket = new cdk.aws_s3.Bucket(this, 'InventoryBucket', {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // setup a python 3.11 lambda function
    const pythonFunction = new cdk.aws_lambda.Function(this, 'PythonFunction', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
      code: cdk.aws_lambda.Code.fromAsset('lambda'),
      handler: 'lambda_function.lambda_handler',
      environment: {
        BUCKET_NAME: inventoryBucket.bucketName,
      },
    });

    const sfn = new cdk.aws_stepfunctions.StateMachine(
      this,
      'StateMachineFromFile',
      {
        stateMachineName: 'awsInventory',
        definitionBody: cdk.aws_stepfunctions.DefinitionBody.fromString(`
        {
          "Comment": "Retrieve AWS Inventory",
          "StartAt": "ListAccounts",
          "States": {
            "ListAccounts": {
              "Type": "Task",
              "Next": "MapAccounts",
              "Parameters": {},
              "Resource": "arn:aws:states:::aws-sdk:organizations:listAccounts"
            },
            "MapAccounts": {
              "Type": "Map",
              "ItemProcessor": {
                "ProcessorConfig": {
                  "Mode": "DISTRIBUTED",
                  "ExecutionType": "STANDARD"
                },
                "StartAt": "DescribeRegions",
                "States": {
                  "DescribeRegions": {
                    "Type": "Task",
                    "Parameters": {},
                    "Resource": "arn:aws:states:::aws-sdk:ec2:describeRegions",
                    "Credentials": {
                      "RoleArn.$": "States.Format('arn:aws:iam::{}:role/OrgInventoryReader', $.Id)"
                    },
                    "Next": "MapListClusters",
                    "ResultPath": "$.Result",
                    "ResultSelector": {
                      "Regions.$": "States.JsonMerge($.Result, States.Format('"Id": "{}".', $.Id), false)"
                    }
                  },
                  "MapListClusters": {
                    "Type": "Map",
                    "ItemProcessor": {
                      "ProcessorConfig": {
                        "Mode": "DISTRIBUTED",
                        "ExecutionType": "STANDARD"
                      },
                      "StartAt": "ListClusters",
                      "States": {
                        "ListClusters": {
                          "Type": "Task",
                          "Parameters": {},
                          "Resource": "arn:aws:states:::aws-sdk:eks:listClusters",
                          "Credentials": {
                            "RoleArn.$": "States.Format('arn:aws:iam::{}:role/OrgInventoryReader', $.Id)"
                          },
                          "Catch": [
                            {
                              "ErrorEquals": [
                                "Eks.AccessDeniedException"
                              ],
                              "Next": "ListClusters"
                            }
                          ],
                          "Next": "MapDescribeClusters",
                          "ResultPath": "$.Result"
                        },
                        "MapDescribeClusters": {
                          "Type": "Map",
                          "ItemProcessor": {
                            "ProcessorConfig": {
                              "Mode": "DISTRIBUTED",
                              "ExecutionType": "STANDARD"
                            },
                            "StartAt": "DescribeCluster",
                            "States": {
                              "DescribeCluster": {
                                "Type": "Task",
                                "End": true,
                                "Parameters": {
                                  "Name": "test"
                                },
                                "Resource": "arn:aws:states:::aws-sdk:eks:describeCluster",
                                "Credentials": {
                                  "RoleArn.$": "States.Format('arn:aws:iam::{}:role/OrgInventoryReader', $.Id)"
                                },
                                "ResultPath": "$.Result",
                                "ResultSelector": {
                                  "arn.$": "$.Cluster.Arn",
                                  "name.$": "$.Cluster.Name",
                                  "platformVersion.$": "$.Cluster.PlatformVersion",
                                  "version.$": "$.Cluster.Version"
                                }
                              }
                            }
                          },
                          "End": true,
                          "Label": "MapDescribeClusters",
                          "MaxConcurrency": 1000,
                          "ItemsPath": "$.Result.Clusters",
                          "ResultPath": "$.Result"
                        }
                      }
                    },
                    "End": true,
                    "Label": "MapListClusters",
                    "MaxConcurrency": 10,
                    "ItemsPath": "$.Result.Regions",
                    "ResultPath": "$.Result"
                  }
                }
              },
              "Next": "Pass",
              "Label": "MapAccounts",
              "MaxConcurrency": 10,
              "ItemsPath": "$.Accounts",
              "ResultPath": "$.Result"
            },
            "Pass": {
              "Type": "Pass",
              "Result": "Success",
              "End": true
            }
          }
        }
        `),
      },
    );

    sfn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          'organizations:ListAccounts',
          'ec2:DescribeRegions',
          'eks:ListClusters',
          'eks:DescribeCluster',
        ],
        resources: ['*'],
      }),
    );
    sfn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [
          `arn:aws:states:${this.region}:${this.account}:stateMachine:awsInventory`,
          `arn:aws:states:${this.region}:${this.account}:execution:awsInventory/*`,
        ],
      }),
    );
    sfn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['sts:assumeRole'],
        resources: [`arn:aws:iam::*:role/OrgInventoryReader`],
      }),
    );
  }
}
