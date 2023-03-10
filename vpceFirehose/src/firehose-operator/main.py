import json
import boto3
import os
from botocore.exceptions import ClientError


def lambda_handler(event, context):
    REGION = os.environ["AWS_REGION"]
    client = boto3.client("firehose", REGION)
    target_account = os.environ.get("TARGET_ACCOUNT")
    firehose_url = os.environ.get("FIREHOSE_URL")

    session = boto3.Session()
    sts = session.client("sts")
    response = sts.assume_role(
        RoleArn=f"arn:aws:iam::{target_account}:role/assumeFireHoseRole",
        RoleSessionName="firehose-test-session",
    )

    new_session = boto3.Session(
        aws_access_key_id=response["Credentials"]["AccessKeyId"],
        aws_secret_access_key=response["Credentials"]["SecretAccessKey"],
        aws_session_token=response["Credentials"]["SessionToken"],
    )

    firehose_client = new_session.client(
        "firehose", endpoint_url="https://firehose.us-east-1.amazonaws.com"
    )

    list_firehose_streams(firehose_client)
    describe_firehose(firehose_client)
    put_firehose_record(firehose_client)


def list_firehose_streams(firehose_client):
    print("Calling list_delivery_streams with ListDeliveryStreams allowed policy.")
    delivery_stream_request = firehose_client.list_delivery_streams()
    print(
        "Successfully returned list_delivery_streams request %s."
        % (delivery_stream_request)
    )


def describe_firehose(firehose_client):
    try:
        print(
            "Calling describe_delivery_stream with DescribeDeliveryStream denied policy."
        )
        delivery_stream_info = firehose_client.describe_delivery_stream(
            DeliveryStreamName="firehose"
        )
        print(
            "Successfully returned delivery_stream_info request %s."
            % (delivery_stream_info)
        )
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        print("Caught %s." % (error_code))


def put_firehose_record(firehose_client):
    try:
        print("Putting Record")
        record = {"id": 123, "name": "John Smith", "age": 30}
        record_str = json.dumps(record)
        firehose_record = {"Data": record_str.encode("utf-8")}
        response = firehose_client.put_record(
            DeliveryStreamName="firehose", Record=firehose_record
        )
        print("Successfully put Firehose Record %s." % (response))
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        print("Caught %s." % (error_code))
