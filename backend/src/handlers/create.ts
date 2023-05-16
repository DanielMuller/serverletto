import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'
import { randomUUID } from 'crypto'

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME || '',
  bucketName: process.env.BUCKET_NAME || '',
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  const participantId = randomUUID()
  const now = new Date().toISOString()
  const command = new PutCommand({
    TableName: LOCAL_ENV_VARIABLES.tableName,
    Item: {
      participantId,
      createdAt: now,
      updatedAt: now,
      step: 'new',
    },
  })

  await ddbDocClient.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ participantId }),
  }
}

export const handler = main
