import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  })

  private readonly bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!

  // Generate a presigned URL so clients upload directly to R2 (no server bandwidth)
  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 })
    return { uploadUrl: url, publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}` }
  }

  deleteFile(key: string) {
    return this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
