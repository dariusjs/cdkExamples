import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const client = new SQSClient({ region: process.env.AWS_REGION });
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

export const handler = async (event: any = {}): Promise<any> => {
  const params = {
    DelaySeconds: 10,
    MessageAttributes: {
      Title: {
        DataType: 'String',
        StringValue: 'The Whistler',
      },
      Author: {
        DataType: 'String',
        StringValue: 'John Grisham',
      },
      WeeksOn: {
        DataType: 'Number',
        StringValue: '6',
      },
    },
    MessageBody:
      'Information about current NY Times fiction bestseller for week of 12/11/2016.',
    QueueUrl: SQS_QUEUE_URL,
  };
  const command = new SendMessageCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (error) {
    return error;
  }
};
