# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


# Test 

Run the following to test that the objects are downloaded using TLS 1.0

```
This will succeed:
curl https://CLOUDFRONT_DISTRIBUTION.cloudfront.net/cat.jpg -v --tlsv1.0 --tls-max 1.0 --output cat.jpg

This will fail:
curl https://BUCKET_NAME.s3.amazonaws.com/cat.jpg -v --tlsv1.0 --tls-max 1.0 --output cat.jpg

<Error><Code>InvalidTlsVersion</Code><Message>Amazon S3 will stop supporting TLS 1.0 and TLS 1.1 connections. Please update your client to use TLS version 1.2 or above. To learn more and to update your client, see https://go.aws/3AUlVSb. For further assistance, contact AWS support.</Message><RequestId>RequestId</RequestId><HostId>HostId</HostId></Error>
```