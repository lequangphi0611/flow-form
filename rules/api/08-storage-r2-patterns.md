# 08 - Storage & R2 Upload Patterns

**Layer**: Backend
**Category**: Architecture, Security, Performance
**Severity**: Error
**Enforcement**: Manual Review, TypeScript
**Related Rules**: rules/api/04-service-layering.md, rules/api/09-config-env-patterns.md

## Rationale

FlowForm stores file attachments in Cloudflare R2. Proxying file bytes through NestJS would consume the Render free tier's bandwidth and memory, making large file uploads impossible within the resource constraints. Presigned URLs allow the client to upload directly to R2 while the server retains access control. The 3-step flow ensures no orphaned DB records for failed uploads and no uncontrolled file sizes from malicious requests.

## Rule Definition

1. Never proxy file bytes through NestJS. Always use presigned URLs.
2. Follow the 3-step upload flow: (1) POST /storage/presign to get presigned URL, (2) client uploads directly to R2, (3) POST /storage/confirm to record the upload in the DB.
3. Only create a `file_attachments` DB record after the client confirms upload (step 3) -- not when generating the presigned URL.
4. Enforce 10MB max file size via `ContentLengthRange` in the presigned URL conditions -- not relying on frontend validation alone.
5. Presigned URL expiry: 15 minutes.
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`. Reject all others with HTTP 415.
7. Never hardcode R2 credentials. Use `ConfigService` for all R2 configuration.

## Correct Examples

```ts
// Good: StorageService with presigned URL generation
// src/modules/storage/storage.service.ts
import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { PrismaService } from '@/prisma/prisma.service'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60  // 15 minutes

@Injectable()
export class StorageService {
  private readonly s3: S3Client
  private readonly bucket: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    })
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME')
  }

  // Step 1: generate presigned URL
  async generatePresignedUploadUrl(mimeType: string, formId: string) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new UnsupportedMediaTypeException({
        type: 'https://flowform.dev/errors/unsupported-media-type',
        title: 'Unsupported Media Type',
        status: 415,
        detail: `File type '${mimeType}' is not allowed. Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      })
    }

    const fileKey = `forms/${formId}/attachments/${randomUUID()}`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: mimeType,
      ContentLengthRange: [1, MAX_FILE_SIZE_BYTES],
    })

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    })

    return { uploadUrl, fileKey }
  }

  // Step 3: confirm upload and save DB record
  async confirmUpload(dto: ConfirmUploadDto, ownerId: string) {
    // Verify the file key belongs to a form the user owns
    const form = await this.prisma.form.findFirst({
      where: { id: dto.formId, ownerId },
      select: { id: true },
    })
    if (!form) {
      throw new NotFoundException(`Form '${dto.formId}' not found or not owned by user`)
    }

    // Only create DB record after client confirms upload succeeded
    return this.prisma.fileAttachment.create({
      data: {
        formId: dto.formId,
        fileKey: dto.fileKey,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        uploadedBy: ownerId,
      },
    })
  }
}
```

```ts
// Good: StorageController -- the 3-step endpoints
// src/modules/storage/storage.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { presignRequestSchema, confirmUploadSchema } from '@flowform/validators'
import type { PresignRequestDto, ConfirmUploadDto, SessionUser } from '@flowform/validators'
import { StorageService } from './storage.service'

@Controller('storage')
@UseGuards(AuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // Step 1: client requests presigned URL
  @Post('presign')
  async presign(
    @Body(new ZodValidationPipe(presignRequestSchema)) dto: PresignRequestDto,
    @CurrentUser() user: SessionUser,
  ) {
    // Returns { uploadUrl, fileKey }
    return this.storageService.generatePresignedUploadUrl(dto.mimeType, dto.formId)
  }

  // Step 3: client confirms upload completed
  @Post('confirm')
  async confirm(
    @Body(new ZodValidationPipe(confirmUploadSchema)) dto: ConfirmUploadDto,
    @CurrentUser() user: SessionUser,
  ) {
    // Creates file_attachments record; returns the saved record
    return this.storageService.confirmUpload(dto, user.id)
  }
}
```

```ts
// Good: Zod schemas for storage endpoints in @flowform/validators
// packages/validators/src/storage.schema.ts
import { z } from 'zod'

export const presignRequestSchema = z.object({
  formId: z.string().uuid(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
})

export const confirmUploadSchema = z.object({
  formId: z.string().uuid(),
  fileKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
})

export type PresignRequestDto = z.infer<typeof presignRequestSchema>
export type ConfirmUploadDto = z.infer<typeof confirmUploadSchema>
```

```
// Good: 3-step flow from the client's perspective
//
// Step 1 -- get presigned URL
// POST /api/storage/presign
// Body: { formId: 'uuid', mimeType: 'image/jpeg' }
// Response: { uploadUrl: 'https://r2.example.com/...?sig=...', fileKey: 'forms/uuid/...' }
//
// Step 2 -- client uploads directly to R2 (no NestJS involvement)
// PUT <uploadUrl>
// Headers: Content-Type: image/jpeg
// Body: <file bytes>
//
// Step 3 -- confirm upload
// POST /api/storage/confirm
// Body: { formId: 'uuid', fileKey: '...', filename: 'photo.jpg', mimeType: 'image/jpeg', size: 42000 }
// Response: { id: 'uuid', fileKey: '...', filename: 'photo.jpg', ... }
```

## Incorrect Examples

```ts
// Bad: proxying file bytes through NestJS
@Post('upload')
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: SessionUser,
) {
  // File bytes flow through NestJS memory -- 10MB file = 10MB RAM consumed per concurrent upload
  await this.s3.putObject({ Bucket: this.bucket, Key: uuid(), Body: file.buffer })
  return { fileKey }
}
```

```ts
// Bad: creating DB record before client confirms upload
async generatePresignedUrl(mimeType: string, formId: string, ownerId: string) {
  const fileKey = `forms/${formId}/${randomUUID()}`

  // Created too early -- if the client never uploads (network error, tab closed),
  // this record points to a non-existent file in R2
  await this.prisma.fileAttachment.create({
    data: { formId, fileKey, mimeType, uploadedBy: ownerId },
  })

  const uploadUrl = await getSignedUrl(...)
  return { uploadUrl, fileKey }
}
```

```ts
// Bad: hardcoded R2 credentials
const s3 = new S3Client({
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',     // hardcoded -- exposed in git history
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG', // hardcoded
  },
})
```

```ts
// Bad: frontend-only file size validation (can be bypassed)
// Only checking on frontend:
if (file.size > 10 * 1024 * 1024) {
  alert('File too large')
  return
}
// The presigned URL has no size limit -- a malicious user can upload any size directly to R2
```

```ts
// Bad: accepting all MIME types
async generatePresignedUrl(mimeType: string) {
  // No MIME type check -- a user can upload .exe, .sh, .html (XSS risk)
  const command = new PutObjectCommand({
    Bucket: this.bucket,
    Key: `${randomUUID()}`,
    ContentType: mimeType,  // any content type accepted
  })
}
```

## Exceptions

- During local development, a local MinIO instance may be used instead of R2. The `R2_ENDPOINT` env var should point to the MinIO endpoint. No code changes needed.
- If the product adds new allowed file types in the future, update the `ALLOWED_MIME_TYPES` set in `StorageService` AND the Zod enum in `@flowform/validators` simultaneously to keep validation in sync.

## Cross-Layer Consistency Notes

- The frontend must implement all 3 steps: (1) call `/api/storage/presign`, (2) PUT to the returned `uploadUrl`, (3) call `/api/storage/confirm`. See `rules/frontend/18-form-engine.md` for the frontend side of file upload.
- The embed widget does NOT handle file uploads -- file upload fields in forms are not supported in the embed widget in the current scope.
- MIME type allowlist is defined in both `StorageService` (runtime enforcement) and `@flowform/validators` (schema validation). Both must be updated together when changing allowed types.
