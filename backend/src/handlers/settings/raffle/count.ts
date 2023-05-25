import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME || '',
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  const commandInput: ScanCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.tableName,
    FilterExpression: 'step = :step',
    ExpressionAttributeValues: {
      ':step': 'done',
    },
    Select: 'COUNT',
  }

  const command = new ScanCommand(commandInput)

  const response = await ddbDocClient.send(command)

  log.info('Count', { response })
  const result = {
    count: response.Count,
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}

export const handler = main
