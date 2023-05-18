import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
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
  sourceImage: string
  notificationTableName: string
}
/**
 * Notify Admins of new Image
 */
export async function notifyAdmins(params: NotifyAdmins): Promise<void> {
  const { notificationTableName, participant, sourceImage } = params
  const command = new ScanCommand({
    TableName: notificationTableName,
    Limit: 50,
  })

  const response = await ddbDocClient.send(command)
  if (!response.Items || !sourceImage) {
    return
  }

  const recipients = response.Items.map((recipient) => {
    return { name: recipient.name, addr: recipient.email }
  })
  if (!participant.watermarkImage) {
    log.info('Watermark Image not found', { participant })
    return
  }
  await buildAndSend({
    sourceImage,
    participant,
    recipients,
  })
}
