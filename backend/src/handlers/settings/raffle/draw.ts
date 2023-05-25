import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'
import { Participants } from 'participants'

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME || '',
  settingsTableName: `${process.env.SETTINGS_TABLE_NAME}` || '',
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  /**
   *  Close event
   */
  const closeCommand = new PutCommand({
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Item: {
      category: 'PARAMS',
      param: 'appClosed',
      value: true,
    },
  })
  await ddbDocClient.send(closeCommand)

  const getWinnersCommand = new GetCommand({
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Key: {
      category: 'RAFFLE',
      param: 'winners',
    },
  })
  const winnersRes = await ddbDocClient.send(getWinnersCommand)
  if (winnersRes.Item && winnersRes.Item.value) {
    const items: Participants.Item[] = winnersRes.Item.value
    const result = {
      ids: items.map((el) => el.participantId),
      items,
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    }
  }

  const amountCommand = new GetCommand({
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Key: {
      category: 'PARAMS',
      param: 'amountPrices',
    },
  })
  const amountRes = await ddbDocClient.send(amountCommand)
  const amount = parseInt(amountRes.Item?.value) || 1

  /**
   * Get All
   */
  const scanResults: Participants.Item[] = []
  let res

  const scanCommandInput: ScanCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.tableName,
    FilterExpression: 'step = :step',
    ExpressionAttributeValues: {
      ':step': 'done',
    },
  }

  do {
    const scanCommand = new ScanCommand(scanCommandInput)
    res = await ddbDocClient.send(scanCommand)
    res.Items?.forEach((item) => scanResults.push(item as Participants.Item))
    scanCommandInput.ExclusiveStartKey = res.LastEvaluatedKey
  } while (typeof res.LastEvaluatedKey !== 'undefined')

  const count = scanResults.length
  const amountToDraw = Math.min(count, amount)
  const winners: Participants.Item[] = []
  const winnerIds: number[] = []
  while (winnerIds.length < amountToDraw) {
    const winnerId = Math.floor(Math.random() * (count + 1))
    if (!winnerIds.includes(winnerId)) {
      winnerIds.push(winnerId)
      winners.push(scanResults[winnerId])
    }
  }

  const putCommand = new PutCommand({
    TableName: LOCAL_ENV_VARIABLES.settingsTableName,
    Item: {
      category: 'RAFFLE',
      param: 'winners',
      value: winners,
    },
  })
  await ddbDocClient.send(putCommand)
  const result = { ids: winnerIds, items: winners }
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}

export const handler = main
