import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secret = async () => {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  const params = {
    SecretId: 'forty/two',
  };
  const command = new GetSecretValueCommand(params);
  try {
    const data = await client.send(command);
    return data.SecretString;
  } catch (error) {
    return error;
  }
};

export const handler = async (event: any = {}): Promise<any> => {
  const response = JSON.stringify(event, null, 2);
  const fortyTwo = await secret();
  console.log(fortyTwo);
  return response;
};
