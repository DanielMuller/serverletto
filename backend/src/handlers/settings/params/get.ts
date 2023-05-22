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
      ':category': 'PARAMS',
    },
  }
  if (lastEvaluatedKey) {
    commandInput.ExclusiveStartKey = {
      participantId: lastEvaluatedKey,
    }
  }

  const command = new QueryCommand(commandInput)

  const response = await ddbDocClient.send(command)

  const eventNames: Record<string, string> = {}
  response.Items?.filter((el) => el.param.startsWith('eventNames')).map(
    (item: Record<string, string>) => {
      const lang = item.param.split('#')[1]
      eventNames[lang] = item.value
      return undefined
    },
  )
  const imageLabels: Record<string, string> = {}
  response.Items?.filter((el) => el.param.startsWith('imageLabels')).map(
    (item: Record<string, string>) => {
      const lang = item.param.split('#')[1]
      imageLabels[lang] = item.value
      return undefined
    },
  )
  const items = {
    defaultLanguage: getDefaultLanguage(response.Items),
    languages: getLanguages(response.Items),
    eventNames,
    imageLabels,
  }

  const result = {
    lastEvaluatedKey: response.LastEvaluatedKey,
    items,
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}

/**
 * Get default languages
 */
function getDefaultLanguage(
  items: Record<string, string | string[]>[] | undefined,
): string | string[] {
  const fallback = 'en'
  if (!items) {
    return fallback
  }
  try {
    return items.filter((el) => el.param === 'defaultLanguage')[0].value || fallback
  } catch {
    return fallback
  }
}
/**
 * Get available languages
 */
function getLanguages(items: Record<string, string | string[]>[] | undefined): string | string[] {
  const fallback = ['en', 'fr']
  if (!items) {
    return fallback
  }
  try {
    return items.filter((el) => el.param === 'languages')[0].value || fallback
  } catch {
    return fallback
  }
}
export const handler = main
