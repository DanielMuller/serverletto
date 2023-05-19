import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand, DeleteCommandInput } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'

const LOCAL_ENV_VARIABLES = {
  settingsTableName: process.env.SETTINGS_TABLE_NAME || '',
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  const contactId = event.pathParameters?.contactId

  const commandDelete: DeleteCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Key: {
      category: 'NOTIFICATION',
      param: contactId,
    },
  }

  const command = new DeleteCommand(commandDelete)

  await ddbDocClient.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'deleted' }),
  }
}

export const handler = main
