# 12 — Next.js Route Handlers (Internal API)

## Route Handler là gì trong FlowForm

FlowForm có 2 tầng API:
- **NestJS** (`apps/api`) — API chính, business logic
- **Next.js Route Handlers** (`apps/web/src/app/api/`) — Internal API, BFF layer

Route Handlers KHÔNG phải nơi viết business logic. Chúng chỉ giải quyết những việc mà **chỉ Next.js server mới làm được** hoặc **không muốn expose trực tiếp client → NestJS**.

---

## Khi nào tạo Route Handler

| Tình huống | Route Handler? | Lý do |
|---|---|---|
| CRUD forms, responses | ❌ Gọi NestJS trực tiếp | Không cần lớp trung gian |
| File upload (avatar, đính kèm) | ✅ | Cần xử lý `multipart/form-data`, gọi NestJS lấy presigned URL |
| Webhook từ bên ngoài | ✅ | Nhận POST từ service ngoài, trigger `revalidateTag` |
| On-demand revalidation | ✅ | NestJS gọi lại để clear Next.js cache |
| Che giấu credentials | ✅ | Header, key không muốn expose ra browser |
| Proxy request cần transform | ✅ | Gộp nhiều NestJS call thành 1 response |

```
app/api/
├── upload/
│   └── route.ts          ← Lấy presigned URL từ NestJS, trả về client
├── revalidate/
│   └── route.ts          ← NestJS gọi để clear Next.js cache sau publish
└── (auth đã ở NestJS — không tạo thêm ở đây)
```

---

## Quy tắc viết Route Handler

### 1. Luôn dùng `NextRequest` / `NextResponse`

```ts
// ✅ — src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // ...
  return NextResponse.json({ uploadUrl, publicUrl })
}
```

```ts
// ❌ — Dùng Web API Request/Response thô — thiếu helper của Next.js
export async function POST(request: Request) { ... }
```

---

### 2. Validate input trước khi xử lý

```ts
// ✅ — src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const UploadRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^(image|application)\//),
  formId: z.string().cuid(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = UploadRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { fileName, contentType, formId } = parsed.data
  // ...
}
```

---

### 3. Route Handler chỉ orchestrate — không chứa business logic

Business logic (tạo record, tính toán) thuộc về NestJS.

```ts
// ✅ — Route Handler: nhận request → gọi NestJS → trả về client
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  fileName: z.string().min(1),
  contentType: z.string(),
  formId: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  // Gọi NestJS để lấy presigned URL — NestJS biết R2 credentials
  const res = await fetch(`${process.env.API_URL}/api/storage/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 502 })
  }

  const { uploadUrl, publicUrl } = await res.json()
  return NextResponse.json({ uploadUrl, publicUrl })
}
```

```ts
// ❌ — Business logic trong Route Handler
export async function POST(request: NextRequest) {
  const { fileName } = await request.json()

  // ❌ Không gọi R2 trực tiếp từ Next.js — đây là việc của NestJS/StorageService
  const s3 = new S3Client(...)
  const command = new PutObjectCommand({ Bucket: 'flowform', Key: fileName })
  const uploadUrl = await getSignedUrl(s3, command)
  return NextResponse.json({ uploadUrl })
}
```

---

### 4. On-demand revalidation — NestJS gọi lại Next.js

Khi form được publish, NestJS gọi Route Handler này để xóa cache của public form.

```ts
// ✅ — src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  // Xác thực secret để không ai gọi lung tung
  const secret = request.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tag, path } = await request.json()

  if (tag) revalidateTag(tag)          // vd: revalidateTag('form-abc123')
  if (path) revalidatePath(path)       // vd: revalidatePath('/f/abc123')

  return NextResponse.json({ revalidated: true })
}
```

NestJS gọi sau khi publish:
```ts
// apps/api/src/modules/forms/forms.service.ts
async publish(id: string) {
  const form = await this.prisma.form.update({ where: { id }, data: { published: true } })

  // Gọi Next.js để xóa cache
  await fetch(`${process.env.FRONTEND_URL}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': process.env.REVALIDATE_SECRET!,
    },
    body: JSON.stringify({ tag: `form-${id}`, path: `/f/${id}` }),
  })

  return form
}
```

---

## Không gọi Route Handler từ Server Component

Server Component có thể gọi trực tiếp `src/lib/data/` — không cần đi vòng qua Route Handler.

```tsx
// ❌ — Server Component gọi chính Route Handler của mình → HTTP round-trip thừa
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  // Gọi http://localhost:3000/api/forms/id → Next.js server → NestJS → Next.js → component
  const form = await fetch(`http://localhost:3000/api/forms/${id}`).then(r => r.json())
  return <BuilderShell initialForm={form} />
}
```

```tsx
// ✅ — Server Component gọi thẳng lib/data — không qua Route Handler
import { getForm } from '@/lib/data/forms'

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await getForm(id)  // gọi thẳng NestJS, không round-trip
  if (!form) notFound()
  return <BuilderShell initialForm={form} />
}
```

---

## Gọi Route Handler từ Client Component

Client Component gọi Route Handler qua đường dẫn tương đối (không cần `NEXT_PUBLIC_API_URL`).

```ts
// ✅ — src/lib/api/upload.ts
export const uploadApi = {
  getPresignedUrl: (payload: {
    fileName: string
    contentType: string
    formId: string
  }) =>
    fetch('/api/upload', {           // đường dẫn tương đối → Route Handler
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<{ uploadUrl: string; publicUrl: string }>
    }),
}
```

```tsx
// Component dùng uploadApi
'use client'

import { useMutation } from '@tanstack/react-query'
import { uploadApi } from '@/lib/api/upload'

export function FileUploadField({ formId }: { formId: string }) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (file: File) =>
      uploadApi
        .getPresignedUrl({ fileName: file.name, contentType: file.type, formId })
        .then(({ uploadUrl, publicUrl }) =>
          fetch(uploadUrl, { method: 'PUT', body: file }).then(() => publicUrl)
        ),
  })

  return (
    <input
      type="file"
      disabled={isPending}
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) mutateAsync(file)
      }}
    />
  )
}
```

---

## Toàn cảnh luồng gọi API

```
Browser (Client Component)
  │
  ├── src/lib/api/*.ts  ──────────────────────────────→  NestJS API
  │   (formsApi, analyticsApi...)                         (CRUD, business logic)
  │
  └── /api/* (Route Handler)  ──→  src/app/api/  ──→  NestJS API
      (upload, revalidate...)        Next.js server       (lấy presigned URL,
                                                           trigger revalidate)

Next.js Server (Server Component / Server Action)
  │
  └── src/lib/data/*.ts  ─────────────────────────────→  NestJS API
      (getForm, getForms...)                               (với React.cache + fetch cache)

NestJS API
  └── /api/revalidate  ────────────────────────────────→  Next.js Route Handler
      (sau publish, xóa                                    (revalidateTag)
       Next.js cache)
```
