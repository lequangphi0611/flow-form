import { Inject, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getStorage } from 'firebase-admin/storage'
import type { App } from 'firebase-admin/app'
import { randomUUID } from 'crypto'
import type { EnvConfig } from '../../config/env.schema'
import { PrismaService } from '../../prisma/prisma.service'
import { FIREBASE_APP } from './storage.module'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

@Injectable()
export class StorageService {
  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    formId: string,
    uploadedBy: string,
  ) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new UnsupportedMediaTypeException({
        type: 'https://flowform.dev/errors/unsupported-media-type',
        title: 'Unsupported Media Type',
        status: 415,
        detail: `File type '${mimeType}' is not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      })
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new UnsupportedMediaTypeException({
        type: 'https://flowform.dev/errors/file-too-large',
        title: 'File Too Large',
        status: 413,
        detail: 'File must not exceed 10MB',
      })
    }

    const form = await this.prisma.form.findFirst({
      where: { id: formId },
      select: { id: true },
    })
    if (!form) throw new NotFoundException(`Form '${formId}' not found`)

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileKey = `forms/${formId}/attachments/${randomUUID()}-${sanitizedName}`

    const bucket = getStorage(this.firebaseApp).bucket()
    const file = bucket.file(fileKey)

    await file.save(buffer, { contentType: mimeType, resumable: false })
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileKey}`

    await this.prisma.fileAttachment.create({
      data: {
        formId,
        fileKey,
        filename: originalName,
        mimeType,
        size: buffer.length,
        publicUrl,
        uploadedBy,
      },
    })

    return { publicUrl, fileKey }
  }

  async deleteFile(fileKey: string) {
    const bucket = getStorage(this.firebaseApp).bucket()
    await bucket.file(fileKey).delete()
  }
}
