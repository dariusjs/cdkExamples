# Cloud Development Kit examples

Gerald Stewart recently posted an article which describes nicely how to deal with Environment specifc configurations when deploying your stacks. In this example below from https://github.com/dariusjs/cdkExamples I thought I would implement a full example using an AWS Lambda where we set the API endpoints as environment variables. This might help to see how a full implementation could look like.


To get our CDK project started I like to use projen which takes care of a lot of bootstrapping for projects. To install it you can follow the projen guide on https://github.com/projen/projen but you really just need to install it globally using 'npm -g install projen' or the yarn equivalent.

When its available on your shell you run the below to bootstrap your new project file.

``` bash
projen new awscdk-app-ts 
```



The method I've followed here is Gerald's number 2 option which is the one I tend to use. In the example I've set two API endpoints, one for spacetraders and another for openweather which we will need to load into the lambda. 


https://github.com/dariusjs/cdkExamples/cdk.context.json
``` JSON
{
  "development": {
    "spacetraders": "https://dev-api.spacetraders.io/game/status",
    "openweather": "https://dev-api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}"
  },
  "test": {
    "spacetraders": "https://test-api.spacetraders.io/game/status",
    "openweather": "https://test-api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}"
  },
  "production": {
    "spacetraders": "https://api.spacetraders.io/game/status",
    "openweather": "https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}"
  }
}

```

The next step is we can create an Interface which defines how the endpoints are loaded. CDK supports strings when using the scope.node.tryGetContext helper.

https://github.com/dariusjs/cdkExamples/functions/hello/index.ts
``` typescript
interface EndPointConfig {
  readonly spacetraders: string;
  readonly openweather: string;
}
```

With that now out of the way we can use the handy NodejsFunction helper for CDK which will transpile our code using esbuild into a minified version of the code for fast startup times.  


https://github.com/dariusjs/cdkExamples/functions/hello/index.ts
``` typescript
import * as lambda from '@aws-cdk/aws-lambda-nodejs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const environment: string = process.env.ENV_NAME || 'development';
    const envConfig: EndPointConfig = scope.node.tryGetContext(environment);

    new lambda.NodejsFunction(this, 'MyFunction', {
      entry: './functions/hello/index.ts',
      environment: {
        SPACETRADERS_API: envConfig.spacetraders,
        OPENWEATHER_API: envConfig.openweather,
      },
      handler: 'index.handler',
    });
  }
}
```

Running a "cdk synth" locally on the project will now generate a cloudformation template where we see the Environment Variables are loaded.

```
  MyFunction3BAA72D1:
    Type: AWS::Lambda::Function
    Properties:
      Role:
        Fn::GetAtt:
          - MyFunctionServiceRole3C357FF2
          - Arn
      Environment:
        Variables:
          SPACETRADERS_API: https://api.spacetraders.io/game/status
          OPENWEATHER_API: https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      Handler: index.index.handler
      Runtime: nodejs14.x
```

Hopefully this was helpful in how this all fits together in a simplified Lambda.
