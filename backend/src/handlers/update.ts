import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import log from 'lambda-log'
import { Participants } from 'participants'

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

  const participantId = event.pathParameters?.participantId

  if (!event.body || !participantId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Missing payload',
      }),
    }
  }

  const body: Partial<Participants.Item> = event.isBase64Encoded
    ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'))
    : JSON.parse(event.body)

  if (!body.step) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Missing payload',
      }),
    }
  }
  const updateExpression = ['#updatedAt = :updatedAt', '#step = :step']
  const expressionAttributeValues: Record<string, string | number | object> = {
    ':updatedAt': new Date().toISOString(),
    ':step': body.step,
  }
  const expressionAttributeNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
    '#step': 'step',
  }
  if (body.name) {
    updateExpression.push('#name = :name')
    expressionAttributeValues[':name'] = body.name
    expressionAttributeNames['#name'] = 'name'
  }
  if (body.email) {
    updateExpression.push('#email = :email')
    expressionAttributeValues[':email'] = body.email
    expressionAttributeNames['#email'] = 'email'
  }
  if (body.locale) {
    updateExpression.push('#locale = :locale')
    expressionAttributeValues[':locale'] = body.locale
    expressionAttributeNames['#locale'] = 'locale'
  }
  if (body.step === 'image' && body.image?.key) {
    if (body.image?.key) {
      updateExpression.push('#image = :image')
      expressionAttributeValues[':image'] = {
        bucket: LOCAL_ENV_VARIABLES.bucketName,
        key: body.image?.key,
        crop: body.image?.crop,
      }
      expressionAttributeNames['#image'] = 'image'
    }
  }

  const command = new UpdateCommand({
    TableName: LOCAL_ENV_VARIABLES.tableName,
    Key: {
      participantId,
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ConditionExpression: 'attribute_exists(participantId)',
  })

  log.info('update', { command })

  await ddbDocClient.send(command)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Updated' }),
  }
}

export const handler = main
