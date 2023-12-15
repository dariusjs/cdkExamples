import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class SfnMultiPartUploadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // python 3.11 lambda function
    const lambda = new cdk.aws_lambda.Function(this, 'python311Lambda', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_11,
      code: cdk.aws_lambda.Code.fromAsset('src/'),
      handler: 'main.handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    const stateMachine = new cdk.aws_stepfunctions.StateMachine(
      this,
      'MultiPartUploader',
      {
        definitionBody: cdk.aws_stepfunctions.DefinitionBody.fromString(`
        {
          "Comment": "A description of my state machine",
          "StartAt": "HeadObject",
          "States": {
            "HeadObject": {
              "Type": "Task",
              "Parameters": {
                "Bucket.$": "$.source.Bucket",
                "Key.$": "$.source.Key"
              },
              "Resource": "arn:aws:states:::aws-sdk:s3:headObject",
              "Next": "Lambda Invoke",
              "ResultPath": "$.source.data"
            },
            "Lambda Invoke": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${lambda.functionArn}",
                "Payload.$": "$"
              },
              "Retry": [
                {
                  "ErrorEquals": [
                    "Lambda.ServiceException",
                    "Lambda.AWSLambdaException",
                    "Lambda.SdkClientException",
                    "Lambda.TooManyRequestsException"
                  ],
                  "IntervalSeconds": 1,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Next": "CreateMultipartUpload",
              "ResultPath": "$.Payload"
            },
            "CreateMultipartUpload": {
              "Type": "Task",
              "Next": "Map",
              "Parameters": {
                "Bucket.$": "$.destination.Bucket",
                "Key.$": "$.destination.Key"
              },
              "Resource": "arn:aws:states:::aws-sdk:s3:createMultipartUpload",
              "ResultPath": "$.data.createMultiUploadPart"
            },
            "Map": {
              "Type": "Map",
              "ItemProcessor": {
                "ProcessorConfig": {
                  "Mode": "INLINE"
                },
                "StartAt": "UploadPartCopy",
                "States": {
                  "UploadPartCopy": {
                    "Type": "Task",
                    "Parameters": {
                      "Bucket.$": "$.Bucket",
                      "Key.$": "$.Key",
                      "CopySource.$": "$.CopySource",
                      "PartNumber.$": "$.PartNumber",
                      "UploadId.$": "$.UploadId",
                      "CopySourceRange.$": "$.CopySourceRange"
                    },
                    "Resource": "arn:aws:states:::aws-sdk:s3:uploadPartCopy",
                    "ResultPath": "$.ETag",
                    "ResultSelector": {
                      "ETag.$": "$.CopyPartResult.ETag"
                    },
                    "Next": "Pass",
                    "Retry": [
                      {
                        "ErrorEquals": [
                          "States.ALL"
                        ],
                        "BackoffRate": 2,
                        "IntervalSeconds": 1,
                        "MaxAttempts": 3,
                        "JitterStrategy": "FULL"
                      }
                    ]
                  },
                  "Pass": {
                    "Type": "Pass",
                    "Parameters": {
                      "PartNumber.$": "$.PartNumber",
                      "ETag.$": "$.ETag.ETag"
                    },
                    "End": true
                  }
                }
              },
              "Next": "CompleteMultipartUpload",
              "ItemsPath": "$.Payload.Payload",
              "ItemSelector": {
                "Bucket.$": "$.destination.Bucket",
                "Key.$": "$.destination.Key",
                "CopySource.$": "States.Format('{}/{}', $.source.Bucket, $.source.Key)",
                "PartNumber.$": "States.MathAdd($$.Map.Item.Index, 1)",
                "UploadId.$": "$.data.createMultiUploadPart.UploadId",
                "CopySourceRange.$": "$$.Map.Item.Value",
                "ContextIndex.$": "$$.Map.Item.Index"
              },
              "MaxConcurrency": 10,
              "ResultPath": "$.Parts.Parts"
            },
            "CompleteMultipartUpload": {
              "Type": "Task",
              "End": true,
              "Parameters": {
                "Bucket.$": "$.destination.Bucket",
                "Key.$": "$.destination.Key",
                "UploadId.$": "$.data.createMultiUploadPart.UploadId",
                "MultipartUpload.$": "$.Parts"
              },
              "Resource": "arn:aws:states:::aws-sdk:s3:completeMultipartUpload",
              "Retry": [
                {
                  "ErrorEquals": [
                    "States.ALL"
                  ],
                  "BackoffRate": 2,
                  "IntervalSeconds": 1,
                  "MaxAttempts": 3,
                  "JitterStrategy": "FULL"
                }
              ]
            }
          }
        }
        `),
      },
    );

    stateMachine.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:*'],
        resources: ['*'],
        effect: cdk.aws_iam.Effect.ALLOW,
      }),
    );
    lambda.grantInvoke(stateMachine);
  }
}
