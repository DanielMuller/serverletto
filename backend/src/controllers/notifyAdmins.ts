import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'
import { buildAndSend } from '@@services/email'
import { Participants } from 'participants'

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client, { marshallOptions })

interface NotifyAdmins {
  participant: Participants.Item
  sourceImage?: string
  settingsTableName: string
}
/**
 * Notify Admins of new Image
 */
export async function notifyAdmins(params: NotifyAdmins): Promise<void> {
  const { settingsTableName, participant, sourceImage } = params
  const command = new QueryCommand({
    TableName: settingsTableName,
    KeyConditionExpression: 'category = :category',
    ExpressionAttributeValues: {
      ':category': 'NOTIFICATION',
    },
    Limit: 50,
  })

  const response = await ddbDocClient.send(command)
  if (!response.Items || !sourceImage) {
    return
  }

  const recipients = response.Items.map((recipient) => {
    return { name: recipient.name, addr: recipient.email }
  })
  if (!sourceImage) {
    log.info('Watermark Image not found', { participant })
    return
  }
  await buildAndSend({
    sourceImage,
    participant,
    recipients,
  })
}
