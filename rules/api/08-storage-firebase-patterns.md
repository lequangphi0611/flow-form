# 08 - Storage & Firebase Upload Patterns

**Layer**: Backend
**Category**: Architecture, Security, Performance
**Severity**: Error
**Enforcement**: Manual Review, TypeScript
**Related Rules**: rules/api/04-service-layering.md, rules/api/09-config-env-patterns.md

## Rationale

FlowForm dùng **Firebase Storage (Spark plan)** để lưu file đính kèm. Spark plan không hỗ trợ `getSignedUrl()` từ Admin SDK (chỉ có trên Blaze/pay-as-you-go) — do đó không thể dùng presigned URL flow.

Thay vào đó, file được proxy qua NestJS: client POST `multipart/form-data` → NestJS buffer + upload lên Firebase qua `firebase-admin` → trả `publicUrl`. Với giới hạn 10MB và Render free tier (512MB RAM), tối đa ~50 concurrent uploads — chấp nhận được cho giai đoạn đầu.

## Rule Definition

1. **Không bao giờ dùng `getSignedUrl()`** — API này yêu cầu Blaze plan. Chỉ dùng `bucket.file(key).save(buffer)`.
2. **Luôn gọi `file.makePublic()`** sau khi save — tạo public read access không cần token. Public URL format: `https://storage.googleapis.com/{bucketName}/{fileKey}`.
3. **Validate MIME type 2 lớp**: Multer `fileFilter` (từ chối trước khi vào handler) + `StorageService.uploadFile()` (defense-in-depth). Cả hai phải từ chối cùng allowlist.
4. **Enforce 10MB qua Multer `limits.fileSize`** — Multer reject file quá lớn trước khi buffer vào RAM.
5. **Dùng `resumable: false`** trong `file.save()` — loại bỏ HTTP round-trip phụ cho files ≤10MB.
6. **Tạo `FileAttachment` DB record trong `StorageService.uploadFile()`** — ngay sau `makePublic()`, trong cùng request. Không tách thành confirm endpoint riêng.
7. **Guard double-initialization** trong `StorageModule`: check `getApps().length > 0` trước khi `initializeApp()`.
8. **`FIREBASE_PRIVATE_KEY` cần `.replace(/\\n/g, '\n')`** trước khi truyền vào `cert()` — dotenv lưu newline dưới dạng `\n` literal.
9. Không hardcode Firebase credentials — dùng `ConfigService` cho tất cả 4 biến Firebase.

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
// ✅ — StorageModule với Firebase provider
// src/modules/storage/storage.module.ts
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import type { EnvConfig } from '@/config/env.schema'

export const FIREBASE_APP = 'FIREBASE_APP'

const firebaseProvider = {
  provide: FIREBASE_APP,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>): App => {
    // Guard against double-init (hot reload in dev)
    if (getApps().length > 0) return getApps()[0]
    return initializeApp({
      credential: cert({
        projectId: config.getOrThrow('FIREBASE_PROJECT_ID'),
        clientEmail: config.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        // dotenv stores newlines as literal \n — must convert to real newlines
        privateKey: config.getOrThrow('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
      storageBucket: config.getOrThrow('FIREBASE_STORAGE_BUCKET'),
    })
  },
}

@Module({
  controllers: [StorageController],
  providers: [firebaseProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

```ts
// ✅ — StorageService với proxy upload
// src/modules/storage/storage.service.ts
import { Inject, Injectable, UnsupportedMediaTypeException } from '@nestjs/common'
import { getStorage } from 'firebase-admin/storage'
import type { App } from 'firebase-admin/app'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFile(buffer: Buffer, originalName: string, mimeType: string, formId: string, uploadedBy: string) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new UnsupportedMediaTypeException(...)

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileKey = `forms/${formId}/attachments/${randomUUID()}-${sanitizedName}`

    const bucket = getStorage(this.firebaseApp).bucket()
    const file = bucket.file(fileKey)

    // resumable: false avoids an extra HTTP round-trip for files ≤10MB
    await file.save(buffer, { contentType: mimeType, resumable: false })
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileKey}`

    // Create DB record only after successful upload — no orphan risk
    await this.prisma.fileAttachment.create({
      data: { formId, fileKey, filename: originalName, mimeType, size: buffer.length, publicUrl, uploadedBy },
    })

    return { publicUrl, fileKey }
  }

  async deleteFile(fileKey: string) {
    await getStorage(this.firebaseApp).bucket().file(fileKey).delete()
  }
}
```

```ts
// ✅ — StorageController với Multer validation
// src/modules/storage/storage.controller.ts
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

@Controller('storage')
export class StorageController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),           // buffer trong RAM, không ghi disk
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — Multer reject trước handler
    fileFilter: (_req, file, cb) => {
      ALLOWED_MIME_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new UnsupportedMediaTypeException(...), false)
    },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('formId') formId: string,
  ) {
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
// Response: { publicUrl: 'https://storage.googleapis.com/...', fileKey: 'forms/uuid/...' }
```

## Incorrect Examples

```ts
// ❌ — getSignedUrl() không hoạt động trên Spark plan
const [url] = await bucket.file(key).getSignedUrl({
  action: 'write',
  expires: Date.now() + 15 * 60 * 1000,
})
// Throws: "This operation is only available for service accounts"
// Hoặc: 403 Forbidden trên Spark plan
```

```ts
// ❌ — Quên replace(\n) trong private key
initializeApp({
  credential: cert({
    privateKey: config.getOrThrow('FIREBASE_PRIVATE_KEY'), // literal \n → firebase-admin crash
  }),
})
```

```ts
// ❌ — Tạo DB record trước khi upload (orphan risk)
async uploadFile(...) {
  await this.prisma.fileAttachment.create({ data: { fileKey, ... } }) // tạo sớm
  await file.save(buffer, ...) // nếu lệnh này fail → orphan DB record
}
```

```ts
// ❌ — Chỉ validate MIME ở Multer, không validate trong service
// Nếu ai đó bypass Multer (test trực tiếp Service), MIME không được check
async uploadFile(buffer: Buffer, mimeType: string, ...) {
  // Thiếu: if (!ALLOWED_MIME_TYPES.has(mimeType)) throw ...
  await file.save(buffer, { contentType: mimeType })
}
```

## Exceptions

- Nếu tương lai cần signed download URL (private files), phải upgrade lên Firebase Blaze plan và dùng `file.getSignedUrl({ action: 'read', expires: ... })`.
- Khi thêm MIME type mới: update `ALLOWED_MIME_TYPES` trong `StorageService` VÀ `ALLOWED_MIME_TYPES` trong `@flowform/validators/storage.schema.ts` đồng thời.

## Cross-Layer Consistency Notes

- Frontend dùng `fetch` với `multipart/form-data` POST trực tiếp đến NestJS. Xem `rules/frontend/18-form-engine.md` section 4.
- Embed widget **không hỗ trợ** file upload — out of scope.
- Firebase env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`) phải có trong env schema — xem `rules/api/09-config-env-patterns.md`.
