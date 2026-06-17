import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { EnvConfig } from '../../config/env.schema'
import { PrismaService } from '../../prisma/prisma.service'
import { SUPABASE_CLIENT } from './storage.constants'

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
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
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
    const bucket = this.config.getOrThrow('SUPABASE_STORAGE_BUCKET')

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(fileKey, buffer, { contentType: mimeType, upsert: false })

    if (error) {
      throw new InternalServerErrorException({
        type: 'https://flowform.dev/errors/storage-upload-failed',
        title: 'Storage Upload Failed',
        status: 500,
        detail: error.message,
      })
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from(bucket).getPublicUrl(fileKey)

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
    const bucket = this.config.getOrThrow('SUPABASE_STORAGE_BUCKET')
    await this.supabase.storage.from(bucket).remove([fileKey])
  }
}
