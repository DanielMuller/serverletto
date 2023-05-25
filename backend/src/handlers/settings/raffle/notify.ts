import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'
import { notify } from '@@services/email'
import { Participants } from 'participants'

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
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Missing payload',
      }),
    }
  }
  const payload: Record<string, string | string[]> = event.isBase64Encoded
    ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
    : JSON.parse(event.body)

  const participantId = payload.participantId

  if (!participantId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Missing participantId',
      }),
    }
  }
  const command = new GetCommand({
    TableName: LOCAL_ENV_VARIABLES.tableName,
    Key: {
      participantId,
    },
  })

  const response = await ddbDocClient.send(command)

  const participant = response.Item as Participants.Item
  if (!participant) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'Participant not found',
      }),
    }
  }
  const result = {
    message: 'done',
  }
  await notify({ participant })
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}

export const handler = main
