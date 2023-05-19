import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb'
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

  const limit = event.queryStringParameters?.limit
    ? Number(event.queryStringParameters?.limit)
    : undefined
  const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey
    ? event.queryStringParameters?.lastEvaluatedKey
    : undefined
  const commandInput: QueryCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Limit: limit,
    KeyConditionExpression: 'category = :category',
    ExpressionAttributeValues: {
      ':category': 'NOTIFICATION',
    },
  }
  if (lastEvaluatedKey) {
    commandInput.ExclusiveStartKey = {
      participantId: lastEvaluatedKey,
    }
  }

  const command = new QueryCommand(commandInput)

  const response = await ddbDocClient.send(command)

  const items = response.Items
  const result = {
    lastEvaluatedKey: response.LastEvaluatedKey,
    items,
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}

export const handler = main
