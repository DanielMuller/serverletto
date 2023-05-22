import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
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

interface Param {
  category?: 'PARAMS'
  param?: string
  value: string | string[]
}

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

  const items: Param[] = []
  for (const [k, v] of Object.entries(payload)) {
    const item: Param = {
      category: 'PARAMS',
      param: k,
      value: v,
    }
    items.push(item)
  }

  const requestItems: BatchWriteCommandInput['RequestItems'] = {}
  requestItems[LOCAL_ENV_VARIABLES.settingsTableName] = items.map((el) => {
    return {
      PutRequest: {
        Item: el,
      },
    }
  })
  const commandWrite: BatchWriteCommandInput = {
    RequestItems: requestItems,
  }

  const command = new BatchWriteCommand(commandWrite)

  await ddbDocClient.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'updated' }),
  }
}

export const handler = main
