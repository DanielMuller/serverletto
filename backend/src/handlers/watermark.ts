import type { S3ObjectCreatedNotificationEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Upload } from '@aws-sdk/lib-storage'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import log from 'lambda-log'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const sharp = require('sharp')

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

const main = async (event: S3ObjectCreatedNotificationEvent): Promise<void> => {
  log.info('Event', { event })

  const key = event.detail.object.key
  const participantId = key.split('/')[1]
  const outputKey = key.replace('original/', 'watermark/')

  const getCommand = new GetObjectCommand({ Bucket: LOCAL_ENV_VARIABLES.bucketName, Key: key })
  const response = await s3Client.send(getCommand)

  if (response.Body) {
    const sourceImage = await response.Body.transformToByteArray()

    const overlayCommand = new GetObjectCommand({
      Bucket: LOCAL_ENV_VARIABLES.bucketName,
      Key: 'dist/slsguru.svg',
    })
    const overlayResponse = await s3Client.send(overlayCommand)

    const sharpImage = await sharp(sourceImage)
    const sharpImageMetadata = await sharpImage.metadata()
    const overlayImage = await sharp(await overlayResponse?.Body?.transformToByteArray())
      .resize({
        width: Math.round(sharpImageMetadata.width / 2),
        height: Math.round(sharpImageMetadata.height / 2),
        fit: 'inside',
      })
      .toBuffer()

    const resizeImage = await sharpImage
      .composite([
        {
          input: overlayImage,
          top: 10,
          left: 10,
        },
        {
          input: {
            text: {
              text: '<span foreground="black">ServerlessDays Paris, 7th June 2023</span>',
              align: 'right',
              width: sharpImageMetadata.width,
              height: 100,
              font: 'serif',
              rgba: true,
            },
          },
          gravity: 'southeast',
        },
      ])
      .jpeg()
      .toBuffer()

    const uploadS3 = new Upload({
      client: s3Client,
      params: {
        Bucket: LOCAL_ENV_VARIABLES.bucketName,
        Key: outputKey,
        Body: resizeImage,
        ContentType: 'image/jpeg',
      },
    })
    uploadS3.on('httpUploadProgress', (progress) => {
      log.info('progress', { progress })
    })
    await uploadS3.done()
    log.info('uploaded')
    const updateExpression = ['#watermarkImage = :watermarkImage']
    const expressionAttributeValues: Record<string, string | number | object> = {
      ':watermarkImage': { bucket: LOCAL_ENV_VARIABLES.bucketName, key: outputKey },
    }
    const expressionAttributeNames: Record<string, string> = {
      '#watermarkImage': 'watermarkImage',
    }

    const ddbCommand = new UpdateCommand({
      TableName: LOCAL_ENV_VARIABLES.tableName,
      Key: {
        participantId,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ConditionExpression: 'attribute_exists(participantId)',
    })
    await ddbDocClient.send(ddbCommand)
  }
}

export const handler = main
