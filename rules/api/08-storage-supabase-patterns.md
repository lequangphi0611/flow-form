# 08 - Storage & Supabase Upload Patterns

**Layer**: Backend
**Category**: Architecture, Security, Performance
**Severity**: Error
**Enforcement**: Manual Review, TypeScript
**Related Rules**: rules/api/04-service-layering.md, rules/api/09-config-env-patterns.md

## Rationale

FlowForm dùng **Supabase Storage (Free tier)** để lưu file đính kèm. File được proxy qua NestJS: client POST `multipart/form-data` → NestJS buffer + upload lên Supabase Storage qua `@supabase/supabase-js` → trả `publicUrl`. Với giới hạn 10MB và Render free tier (512MB RAM), tối đa ~50 concurrent uploads — chấp nhận được cho giai đoạn đầu.

## Rule Definition

1. **Khởi tạo Supabase client bằng `service_role` key** — không dùng `anon` key phía backend. `service_role` key bỏ qua Row Level Security, cho phép upload/delete không cần auth token.
2. **Bucket phải được cấu hình Public** trên Supabase Dashboard — `getPublicUrl()` chỉ trả URL public nếu bucket ở chế độ Public. Không dùng presigned URL flow.
3. **Validate MIME type 2 lớp**: Multer `fileFilter` (từ chối trước khi vào handler) + `StorageService.uploadFile()` (defense-in-depth). Cả hai phải từ chối cùng allowlist.
4. **Enforce 10MB qua Multer `limits.fileSize`** — Multer reject file quá lớn trước khi buffer vào RAM.
5. **Dùng `upsert: false`** trong `supabase.storage.from(bucket).upload()` — ngăn ghi đè file nếu `fileKey` trùng (UUID đảm bảo không trùng, nhưng đây là safety net).
6. **Tạo `FileAttachment` DB record trong `StorageService.uploadFile()`** — ngay sau khi upload thành công, trong cùng request. Không tách thành confirm endpoint riêng.
7. **Xử lý lỗi upload**: Nếu Supabase trả `error` object, throw `InternalServerErrorException` với RFC 7807 format.
8. **Dùng `supabase.storage.from(bucket).remove([fileKey])`** để xóa file — nhận array, không phải string đơn lẻ.
9. Không hardcode Supabase credentials — dùng `ConfigService` cho tất cả 3 biến Supabase.

## Allowed MIME Types

```ts
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])
```

## Correct Examples

```ts
// ✅ — StorageModule với Supabase provider
// src/modules/storage/storage.module.ts
import { Module, Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import type { EnvConfig } from '@/config/env.schema'

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT'

const supabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>) =>
    createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    ),
}

@Module({
  controllers: [StorageController],
  providers: [supabaseProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

```ts
// ✅ — StorageService với proxy upload
// src/modules/storage/storage.service.ts
import { Inject, Injectable, InternalServerErrorException, UnsupportedMediaTypeException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFile(buffer: Buffer, originalName: string, mimeType: string, formId: string, uploadedBy: string) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new UnsupportedMediaTypeException(...)

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileKey = `forms/${formId}/attachments/${randomUUID()}-${sanitizedName}`
    const bucket = this.config.getOrThrow('SUPABASE_STORAGE_BUCKET')

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(fileKey, buffer, { contentType: mimeType, upsert: false })

    if (error) throw new InternalServerErrorException({ ..., detail: error.message })

    const { data: { publicUrl } } = this.supabase.storage.from(bucket).getPublicUrl(fileKey)

    // Create DB record only after successful upload — no orphan risk
    await this.prisma.fileAttachment.create({
      data: { formId, fileKey, filename: originalName, mimeType, size: buffer.length, publicUrl, uploadedBy },
    })

    return { publicUrl, fileKey }
  }

  async deleteFile(fileKey: string) {
    const bucket = this.config.getOrThrow('SUPABASE_STORAGE_BUCKET')
    await this.supabase.storage.from(bucket).remove([fileKey])
  }
}
```

```ts
// ✅ — StorageController với Multer validation (không đổi so với Firebase)
// src/modules/storage/storage.controller.ts
@Controller('storage')
export class StorageController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      ALLOWED_MIME_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new UnsupportedMediaTypeException(...), false)
    },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body('formId') formId: string) {
    return this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype, formId, ...)
  }
}
```

```
// ✅ — Upload flow từ phía client (1 bước)
//
// POST ${API_URL}/api/storage/upload
// Content-Type: multipart/form-data (browser tự set với boundary)
// Body: FormData { file: <File>, formId: 'uuid' }
// credentials: 'include' (session cookie)
//
// Response: { publicUrl: 'https://{project}.supabase.co/storage/v1/object/public/{bucket}/{key}', fileKey: '...' }
```

## Incorrect Examples

```ts
// ❌ — Dùng anon key phía backend
const supabase = createClient(url, process.env.SUPABASE_ANON_KEY)
// anon key bị giới hạn bởi Row Level Security — upload sẽ fail nếu bucket có RLS policy
// Phải dùng SUPABASE_SERVICE_ROLE_KEY cho backend
```

```ts
// ❌ — Dùng upsert: true cho upload mới
await supabase.storage.from(bucket).upload(fileKey, buffer, { upsert: true })
// Che giấu collision; UUID đã đảm bảo fileKey unique, không cần overwrite
```

```ts
// ❌ — Tạo DB record trước khi upload (orphan risk)
async uploadFile(...) {
  await this.prisma.fileAttachment.create({ data: { fileKey, ... } }) // tạo sớm
  await supabase.storage.from(bucket).upload(fileKey, buffer) // nếu fail → orphan DB record
}
```

```ts
// ❌ — Bỏ qua error object từ Supabase
const { data } = await supabase.storage.from(bucket).upload(fileKey, buffer)
// Không check error → nếu upload fail, code tiếp tục với publicUrl undefined
```

```ts
// ❌ — Chỉ validate MIME ở Multer, không validate trong service
async uploadFile(buffer: Buffer, mimeType: string, ...) {
  // Thiếu: if (!ALLOWED_MIME_TYPES.has(mimeType)) throw ...
  await supabase.storage.from(bucket).upload(fileKey, buffer, { contentType: mimeType })
}
```

## Exceptions

- Nếu tương lai cần private files (signed URL), dùng `supabase.storage.from(bucket).createSignedUrl(fileKey, expiresIn)` — Supabase hỗ trợ trên Free tier (không cần nâng cấp như Firebase Blaze).
- Khi thêm MIME type mới: update `ALLOWED_MIME_TYPES` trong `StorageService` VÀ `ALLOWED_MIME_TYPES` trong `@flowform/validators/storage.schema.ts` đồng thời.

## Cross-Layer Consistency Notes

- Frontend dùng `fetch` với `multipart/form-data` POST trực tiếp đến NestJS. Xem `rules/frontend/18-form-engine.md` section 4.
- Embed widget **không hỗ trợ** file upload — out of scope.
- Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`) phải có trong env schema — xem `rules/api/09-config-env-patterns.md`.
