import type { S3ObjectCreatedNotificationEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { Upload } from '@aws-sdk/lib-storage'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import log from 'lambda-log'
import { notifyAdmins } from '@@controllers/notifyAdmins'
import { Participants } from 'participants'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const sharp = require('sharp')

const LOCAL_ENV_VARIABLES = {
  tableName: process.env.TABLE_NAME || '',
  settingsTableName: process.env.SETTINGS_TABLE_NAME || '',
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
    const getCommand = new GetCommand({
      TableName: LOCAL_ENV_VARIABLES.tableName,
      Key: { participantId },
    })
    const participantResponse = await ddbDocClient.send(getCommand)
    const participant = participantResponse.Item as Participants.Item

    const getSettingsCommand = new QueryCommand({
      TableName: LOCAL_ENV_VARIABLES.tableName,
      KeyConditionExpression: 'category = :category and begins_with(param, :param)',
      ExpressionAttributeValues: {
        ':category': 'SETTINGS',
        ':param': 'imageLabels#',
      },
    })

    const settingsResponse = await ddbDocClient.send(getSettingsCommand)
    const labelSettings = settingsResponse.Items as {
      category: 'PARAMS'
      param: string
      value: string
    }[]

    const labelByLocale: Record<string, string> = {}
    labelSettings.map((el) => {
      const lang = el.param.split('#')[1]
      const label = el.value
      labelByLocale[lang] = label
      return undefined
    })
    const sourceImage = await response.Body.transformToByteArray()

    const crop = participant.image ? participant.image.crop : undefined
    const locale = participant.locale === 'fr' ? 'fr' : 'en'

    const overlayCommand = new GetObjectCommand({
      Bucket: LOCAL_ENV_VARIABLES.bucketName,
      Key: 'dist/slsguru.svg',
    })
    const overlayResponse = await s3Client.send(overlayCommand)

    const width = 1190
    const height = 735
    const txtWidth = 800
    const txtHeight = 50
    const txtMarginBottom = 15
    const txtMarginRight = 30
    const imgMarginTop = 35
    const imgMarginLeft = 30

    const sharpImage = await sharp(sourceImage).rotate()
    const overlayImage = await sharp(await overlayResponse?.Body?.transformToByteArray()).resize({
      width: Math.round(width / 2),
      height: Math.round(height / 2),
      fit: 'inside',
    })
    const logoBg = await overlayImage.clone().negate({ alpha: false }).blur(4).toBuffer()
    const logoFg = await overlayImage.clone().toBuffer()

    const label = labelByLocale[locale] || labelByLocale.en
    const textFg = await sharp({
      text: {
        text: `<span foreground="black">${label}</span>`,
        align: 'right',
        width: txtWidth,
        height: txtHeight,
        font: 'sans-serif',
        rgba: true,
      },
    })
      .png()
      .toBuffer()
    const textBg = await sharp({
      text: {
        text: `<span foreground="black">${label}</span>`,
        align: 'right',
        width: txtWidth,
        height: txtHeight,
        font: 'sans-serif',
        rgba: true,
      },
    })
      .blur(3)
      .png()
      .toBuffer()
    const resizeImage = await sharpImage
      .extract(crop)
      .resize({ width, height, fit: 'inside' })
      .composite([
        {
          input: logoBg,
          top: imgMarginTop,
          left: imgMarginLeft,
        },
        {
          input: logoFg,
          top: imgMarginTop,
          left: imgMarginLeft,
        },
        {
          input: textBg,
          top: height - txtHeight - txtMarginBottom,
          left: width - txtWidth - txtMarginRight,
        },
        {
          input: textFg,
          top: height - txtHeight - txtMarginBottom,
          left: width - txtWidth - txtMarginRight,
        },
      ])
      .jpeg()
      .toBuffer()

    log.info('upload', {
      Bucket: LOCAL_ENV_VARIABLES.bucketName,
      Key: outputKey,
      ContentType: 'image/jpeg',
    })
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
    await notifyAdmins({
      settingsTableName: LOCAL_ENV_VARIABLES.settingsTableName,
      participant,
      sourceImage: resizeImage.toString('base64'),
    })
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
