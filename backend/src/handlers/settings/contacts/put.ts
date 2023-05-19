import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
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

interface Contact {
  category?: 'NOTIFICATION'
  param?: string
  name: string
  email: string
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
  const contact: Contact = event.isBase64Encoded
    ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
    : JSON.parse(event.body)

  contact.category = 'NOTIFICATION'
  if (!contact.param) {
    contact.param = randomUUID()
  }
  const commandPut: PutCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Item: contact,
  }

  const command = new PutCommand(commandPut)

  await ddbDocClient.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify(contact),
  }
}

export const handler = main
