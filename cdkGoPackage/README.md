# Cloud Development Kit Examples -building a hello world go app with CDK

## Introduction 

### EDIT - 2021-07-13 - The below is not needed anymore for Go from version v1.103.0 as the higher level construct aws-lambda-go is introduced https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-go-readme.html


CDK has been a boon for me when building and managing services. Packaging up and deploying software has usually involved building some custom build scripts and then co-ordinating the sequencing of these scripts to make sure you have a valid asset that can be deployed. CDK has some constructs available for simplifying Javascript and Pythong deployments  
<https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-nodejs-readme.html>  
<https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-python-readme.html> 

For other supported languages though such as Go or C#, CDK does support Asset bundling so you can convert some of those build scripts. The excerpt below is inspired by some work done by Matthew Bonig <https://twitter.com/mattbonig> <https://github.com/mbonig/rds-tools>

I will skip over most of what CDK is about as well as setting up the project. You can refer to my other article which as a bit more detial. 


## Method

The @aws-cdk/aws-lambda construct has a lot of configuration options. For the sample I've made use of the bundling options which is available under the code parameter. A full example explains it all but the main points are:

* create a build directory which we can compile the code on
* copy over the source
* run the compilation
* the 'outputDir' will detect the asset and include it as part of the CDK assets to be deployed

I'm a big fan of this method as it means when you run 'cdk deploy' the process will fully take care of the build and deployment  as well as how the assets are managed.

In environments such as Finance where there is a lot less flexibility in tampering of builds this might not work, but I'm a big fan of the reproducability.

``` javascript
new Function(this, 'MyFunction', {
    runtime: Runtime.GO_1_X,
    handler: 'index.handler',
    code: Code.fromAsset(assetPath, {
    bundling: {
        image: Runtime.GO_1_X.bundlingImage,
        workingDirectory: `./${buildPath}/${applicationName}/`,
        local: {
        tryBundle: (outputDir: string): boolean => {
            console.log('Start Local Building.');
            if (os.platform() !== 'linux' || os.platform() !== 'darwin') {
            console.warn('Linex and Mac supported Only.');
            }
            const execOptions: ExecSyncOptions = {
            stdio: ['ignore', process.stderr, 'inherit'],
            };
            try {
            execSync(`cp ${assetPath}/${applicationName}/* ${buildPath}/${applicationName}/ `, {
                ...execOptions,
            });
            execSync(`cd _build/${applicationName}/; go build`, {
                ...execOptions,
            });
            execSync(`cp _build/${applicationName}/${applicationName} ${outputDir}`, {
                ...execOptions,
            });
            } catch (error) {
            console.error('Error during local bundling: ' + error);
            return false;
            }
            return true;
        },
        },
    },
    }),
});
```
