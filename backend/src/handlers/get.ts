import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME,
  bucketName: process.env.BUCKET_NAME,
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  const participantId = event.pathParameters?.participantId

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

  const res = await ddbDocClient.send(command)
  if (!res.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'not found' }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(res.Item),
  }
}

export const handler = main
