# 10 — Next.js Caching & Data Fetching (Server-side)

> Rule này chỉ nói về caching trong **Server Components** và **Server Actions**.
> Caching phía client (TanStack Query) xem `04-data-fetching.md`.

---

## Tổng quan — Next.js 15 thay đổi default

Từ Next.js 15: `fetch()` **không cache theo mặc định** (khác với Next.js 14).

```ts
// Next.js 15 — fetch mặc định KHÔNG cache
fetch(url)                               // = no-store (mỗi request gọi lại API)
fetch(url, { cache: 'force-cache' })     // cache vĩnh viễn đến khi invalidate
fetch(url, { next: { revalidate: 60 } }) // ISR — cache 60 giây rồi revalidate
fetch(url, { next: { tags: ['forms'] } }) // tag-based — invalidate theo tag
```

---

## 4 chiến lược caching — khi nào dùng cái nào

### 1. `no-store` — Không cache (mặc định Next.js 15)

Dùng khi data thay đổi thường xuyên hoặc cần real-time.

```tsx
// ✅ — Dashboard form list: user thêm/xóa form liên tục
async function getForms(userId: string): Promise<FormSchema[]> {
  const res = await fetch(`${process.env.API_URL}/api/forms?userId=${userId}`, {
    cache: 'no-store',
    headers: { Cookie: getCookieHeader() }, // forward auth cookie
  })
  if (!res.ok) throw new Error('Failed to fetch forms')
  return res.json()
}
```

```tsx
// ✅ — Builder: đang edit, phải lấy data mới nhất
async function getFormForBuilder(id: string): Promise<FormSchema> {
  const res = await fetch(`${process.env.API_URL}/api/forms/${id}`, {
    cache: 'no-store',
  })
  return res.json()
}
```

---

### 2. `force-cache` — Cache vĩnh viễn

Dùng cho data tĩnh, thay đổi cực hiếm.

```tsx
// ✅ — Field type definitions (không bao giờ thay đổi)
async function getFieldTypes() {
  const res = await fetch(`${process.env.API_URL}/api/field-types`, {
    cache: 'force-cache',
  })
  return res.json()
}
```

> **Lưu ý:** Chỉ cache được khi không truyền Authorization header động.
> Nếu mỗi user có data khác nhau → không dùng `force-cache`.

---

### 3. `revalidate` — ISR (Incremental Static Regeneration)

Dùng cho data ít thay đổi, chấp nhận stale vài phút.

```tsx
// ✅ — Public form (end-user điền): schema không đổi thường xuyên
// src/app/f/[formId]/page.tsx
export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ formId: string }>
}) {
  const { formId } = await params

  const res = await fetch(`${process.env.API_URL}/api/forms/${formId}`, {
    next: { revalidate: 300, tags: [`form-${formId}`] }, // cache 5 phút + tag để invalidate thủ công
  })

  if (!res.ok) return notFound()
  const form: FormSchema = await res.json()

  return <FormEngine form={form} />
}
```

```tsx
// ✅ — Analytics summary: ok nếu stale 5 phút
async function getAnalyticsSummary(formId: string): Promise<FormSummary> {
  const res = await fetch(`${process.env.API_URL}/api/forms/${formId}/analytics/summary`, {
    next: { revalidate: 300 },
  })
  return res.json()
}
```

---

### 4. `tags` — Invalidate theo tag (On-demand revalidation)

Kết hợp với `revalidateTag()` trong Server Actions — invalidate đúng cache khi cần.

```tsx
// src/app/f/[formId]/page.tsx — gắn tag khi fetch
const res = await fetch(`${process.env.API_URL}/api/forms/${formId}`, {
  next: {
    revalidate: 3600,           // cache 1 giờ
    tags: [`form-${formId}`],   // tag này để invalidate thủ công
  },
})
```

```tsx
// src/app/actions/form.actions.ts — Server Action invalidate tag khi publish
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'

export async function publishForm(formId: string) {
  const res = await fetch(`${process.env.API_URL}/api/forms/${formId}/publish`, {
    method: 'PATCH',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Publish failed')

  // Invalidate cache của public form ngay lập tức
  revalidateTag(`form-${formId}`)
  // Optionally invalidate dashboard page
  revalidatePath('/forms')
}
```

---

## `React.cache()` — Deduplication trong 1 request

Khi nhiều Server Component trong cùng 1 request cần cùng data — tránh gọi API 2 lần.

```tsx
// ✅ — src/lib/data/forms.ts
import { cache } from 'react'
import type { FormSchema } from '@flowform/types'

// Memoize theo request — cùng formId chỉ fetch 1 lần dù gọi từ nhiều component
export const getForm = cache(async (id: string): Promise<FormSchema | null> => {
  const res = await fetch(`${process.env.API_URL}/api/forms/${id}`, {
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch form')
  return res.json()
})
```

```tsx
// ✅ — BuilderPage gọi getForm(id)
// src/app/(builder)/forms/[id]/builder/page.tsx
import { getForm } from '@/lib/data/forms'

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await getForm(id)  // fetch lần 1
  if (!form) return notFound()
  return <BuilderShell initialForm={form} />
}
```

```tsx
// ✅ — Metadata cũng gọi getForm(id) — KHÔNG gọi thêm API nhờ React.cache()
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const form = await getForm(id)  // lấy từ cache trong cùng request — 0 network call thêm
  return { title: form?.title ?? 'Form Builder' }
}
```

---

## Mapping chiến lược cho từng route trong FlowForm

| Route | Chiến lược | Lý do |
|---|---|---|
| `app/(dashboard)/forms` | `no-store` | User thêm/xóa form → cần data mới nhất |
| `app/(builder)/forms/[id]/builder` | `no-store` | Đang edit → phải fresh |
| `app/(analytics)/forms/[id]/analytics` | `revalidate: 300` | Analytics ok stale 5 phút |
| `app/f/[formId]` | `revalidate: 3600` + `tags` | Public form ít đổi, invalidate khi publish |

---

## Streaming với Suspense

Dùng `<Suspense>` để stream từng phần của trang, không block toàn bộ.

```tsx
// ✅ — Analytics page: stream summary cards + funnel chart độc lập
// src/app/(analytics)/forms/[id]/analytics/page.tsx
import { Suspense } from 'react'
import { SummaryCards, SummaryCardsSkeleton } from '@/components/analytics/SummaryCards'
import { FunnelContainer, FunnelSkeleton } from '@/components/analytics/FunnelContainer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Stream từng phần độc lập — phần nào load xong hiện trước */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards formId={id} />
      </Suspense>

      <Suspense fallback={<FunnelSkeleton />}>
        <FunnelContainer formId={id} />
      </Suspense>
    </div>
  )
}
```

```tsx
// ✅ — SummaryCards là async Server Component
// src/components/analytics/SummaryCards.tsx
import type { FormSummary } from '@flowform/types'

export async function SummaryCards({ formId }: { formId: string }) {
  const summary: FormSummary = await fetch(
    `${process.env.API_URL}/api/forms/${formId}/analytics/summary`,
    { next: { revalidate: 300 } }
  ).then((r) => r.json())

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Tổng responses" value={summary.totalResponses} />
      <StatCard label="Hoàn thành" value={summary.completedResponses} />
      <StatCard label="Tỷ lệ hoàn thành" value={`${summary.completionRate.toFixed(1)}%`} />
    </div>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
```

---

## `loading.tsx` — Route-level loading

```tsx
// ✅ — src/app/(dashboard)/forms/loading.tsx
// Hiển thị ngay khi navigate đến /forms, trước khi page.tsx fetch xong
export default function FormsLoading() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

> `loading.tsx` wrap tự động vào `<Suspense>` — không cần viết Suspense thủ công ở page level.

---

## Những điều KHÔNG làm

```tsx
// ❌ — Bỏ cache option — Next.js 15 không cache theo default nhưng hãy explicit
const res = await fetch(`${process.env.API_URL}/api/forms/${id}`)
// Tốt hơn: thêm cache: 'no-store' hoặc next: { revalidate: N } để rõ ý định
```

```tsx
// ❌ — Cache data có Authorization header động → cache sẽ leak data giữa các user
const res = await fetch(url, {
  cache: 'force-cache',            // ❌ nếu url khác nhau theo user thì OK, nhưng...
  headers: { Authorization: `Bearer ${userToken}` }, // token khác nhau mỗi user
})
// Dùng no-store cho data private per-user
```

```tsx
// ❌ — Gọi revalidateTag trong Server Component thường — chỉ dùng trong Server Action
// src/components/builder/SomeComponent.tsx (Server Component)
revalidateTag('forms') // ❌ chỉ hợp lệ trong Server Actions và Route Handlers
```

```tsx
// ❌ — Wrap toàn bộ page trong 1 Suspense → mất lợi ích streaming
<Suspense fallback={<Loading />}>
  <SummaryCards formId={id} />    // ❌ block nhau — SummaryCards xong mới hiện FunnelContainer
  <FunnelContainer formId={id} />
</Suspense>

// ✅ — Suspense riêng từng phần → stream độc lập
<Suspense fallback={<SummaryCardsSkeleton />}>
  <SummaryCards formId={id} />
</Suspense>
<Suspense fallback={<FunnelSkeleton />}>
  <FunnelContainer formId={id} />
</Suspense>
```
