import type { APIGatewayProxyResult, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import log from 'lambda-log'

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME,
  bucketName: process.env.BUCKET_NAME,
  region: process.env.AWS_REGION,
}

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
}

const dynamoDbClient = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient, { marshallOptions })
const s3Client = new S3Client({})

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

  const uuid = randomUUID()
  const key = `original/${participantId}/${uuid}/${participantId}.jpg`
  const putCommand = new PutObjectCommand({
    Bucket: LOCAL_ENV_VARIABLES.bucketName,
    Key: key,
  })
  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 })
  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, key }),
  }
}

export const handler = main
