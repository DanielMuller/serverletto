import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({})

/**
 * Generate a signed URL
 */
export async function getPreSignedUrl(object: {
  bucket: string
  key: string
}): Promise<string | undefined> {
  if (!object) {
    return undefined
  }
  const getCommand = new GetObjectCommand({
    Bucket: object.bucket,
    Key: object.key,
  })
  return await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 })
}
