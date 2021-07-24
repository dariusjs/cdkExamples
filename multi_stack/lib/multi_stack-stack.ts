import { NestedStack, NestedStackProps, Stack, StackProps } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import fs = require('fs');

export class RootStack extends Stack {
  constructor(scope: Construct) {
    super(scope, 'rootStack');

    const stackOne = new StackOne(this, {
      functionArn: 'data',
    });
    const stackTwo = new StackTwo(this, {
      functionArn: stackOne.functionArn.functionArn,
    });
    stackTwo.addDependency(stackOne);
  }
}

interface ResourceNestedStackProps extends NestedStackProps {
  readonly functionArn: string;
}

class StackOne extends NestedStack {
  public readonly functionArn: cdk.aws_lambda.Function;
  constructor(scope: Construct, props: ResourceNestedStackProps) {
    super(scope, 'StackOne', props);

    this.functionArn = new cdk.aws_lambda.Function(this, 'fn', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
      handler: 'function',
      code: new cdk.aws_lambda.InlineCode(
        fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' }),
      ),
      environment: {
        FUNCTION_ONE: 'data',
        url: 'long url',
      },
    });
  }
}

class StackTwo extends NestedStack {
  constructor(scope: Construct, props: ResourceNestedStackProps) {
    super(scope, 'StackTwo', props);

    const fn = new cdk.aws_lambda.Function(this, 'fn', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
      handler: 'function',
      code: new cdk.aws_lambda.InlineCode(
        fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' }),
      ),
      environment: {
        FUNCTION_ONE: props.functionArn,
        url: 'long url',
      },
    });
  }
}
