import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import log from 'lambda-log'

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
const s3Client = new S3Client({})

const main = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  log.info('Event', { event })

  const limit = event.queryStringParameters?.limit
    ? Number(event.queryStringParameters?.limit)
    : undefined
  const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey
    ? event.queryStringParameters?.lastEvaluatedKey
    : undefined
  const commandInput: ScanCommandInput = {
    TableName: LOCAL_ENV_VARIABLES.tableName,
    Limit: limit,
  }
  if (lastEvaluatedKey) {
    commandInput.ExclusiveStartKey = {
      participantId: lastEvaluatedKey,
    }
  }

  const command = new ScanCommand(commandInput)

  const response = await ddbDocClient.send(command)

  const items = []
  if (response.Items) {
    for (const item of response.Items) {
      const imageSrc = await getWatermarkUrl(item.watermarkImage)
      items.push({
        ...item,
        imageSrc,
      })
    }
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
 * Generate a signed URL
 */
async function getWatermarkUrl(watermarkImage: {
  bucket: string
  key: string
}): Promise<string | undefined> {
  if (!watermarkImage) {
    return undefined
  }
  const getCommand = new GetObjectCommand({
    Bucket: watermarkImage.bucket,
    Key: watermarkImage.key,
  })
  return await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 })
}
export const handler = main
