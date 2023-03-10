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


## Sample IoT Event

Healthy Event

```json
{
  "timestamp": "20230707T09:30:00Z",
  "device_id": "siemens_wind_turbine_456",
  "message_type": "status_update",
  "component": "N/A",
  "status": "healthy",
  "severity": "normal",
  "type": "meter",
  "power_output": 2150.75,
  "wind_speed": 12.5,
  "location": {
    "latitude": 52.5200,
    "longitude": 13.4050
  }
}
```

Unhealthy Event

```json
{
  "timestamp": "20230707T09:15:00Z",
  "device_id": "siemens_wind_turbine_123",
  "message_type": "component_failure",
  "component": "gearbox",
  "status": "unhealthy",
  "severity": "critical",
  "type": "health",
  "message": "Attention: The gearbox of the wind turbine is showing signs of imminent failure. Immediate maintenance is required.",
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  }
}
```

AWS CLI
```
aws iotanalytics batch-put-message  --channel-name turbinechannel  --messages file://power_events.json --cli-binary-format raw-in-base64-out --profile eleven
```