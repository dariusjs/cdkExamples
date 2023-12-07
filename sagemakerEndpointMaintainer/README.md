# Amazon Sagemaker Endpoint maintainer

This CDK stack deploys an AWS StepFunction that takes the responsibility of maintaining idle Amazon Sagemaker Endpoints. Developers experimenting with Large Language Models may find that they inadvertendly leave idle resources running on GPU instances. 

This step function creates Cloudwatch Alarms after a grace period of 900 seconds which can be adjusted in the Wait Period after the Sagemaker Endpoint goes into the IN_SERVICE state. The grace period is kept low for demonstration purposes and should not be a lower number than the evaluation Period on the Cloudwatch Alarm itself.

# Flow

After a developer has created a Sagemaker model and deployed the model to a Sagemaker Endpoint with the AWS TAG auto-maintain:

1. Eventbridge sends an event to the Sagemaker endpoint when in the IN_SERVICE state
2. Step function evaluates that the auto-maintain TAG has been used 
3. After a grace period of 900 seconds (adjustable) Step Functions issues a PutMetricAlarm where no data detected issues a breached alarm state. This grace period is needed to give some time for the user to issue invocations to the model

If the Alarm reaches the breached state of no detected invocations:

1. Eventbridge issues a DeleteEndpoint command to remove the idle endpoint
2. After the endpoint is deleted an event is fired by Eventbridge to cleanup the idle alarm

# References

https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html#alarms-and-missing-data