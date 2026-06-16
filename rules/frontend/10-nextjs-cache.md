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

## 4 chiến lược caching

### 1. `no-store` — Không cache (mặc định Next.js 15)

Dùng khi data thay đổi thường xuyên hoặc cần real-time.

```tsx
// ✅ — Dashboard form list, Builder: luôn fresh
const res = await fetch(`${process.env.API_URL}/api/forms/${id}`, {
  cache: 'no-store',
})
```

### 2. `force-cache` — Cache vĩnh viễn

Dùng cho data tĩnh, thay đổi cực hiếm. **Không dùng cho data private per-user.**

### 3. `revalidate` — ISR

```tsx
// ✅ — Public form: ít đổi, cache 5 phút
const res = await fetch(`${process.env.API_URL}/api/forms/${formId}`, {
  next: { revalidate: 300, tags: [`form-${formId}`] },
})
```

### 4. `tags` — Invalidate theo tag

```tsx
// Server Action invalidate tag khi publish
'use server'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function publishForm(formId: string) {
  // ... gọi API publish
  revalidateTag(`form-${formId}`)
  revalidatePath('/forms')
}
```

---

## `React.cache()` — Deduplication trong 1 request

```tsx
// ✅ — src/lib/data/forms.ts
import { cache } from 'react'

export const getForm = cache(async (id: string): Promise<FormSchema> => {
  const res = await fetch(`${process.env.API_URL}/api/forms/${id}`, { cache: 'no-store' })
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`getForm failed: ${res.status}`)
  return res.json()
})
// Cùng formId chỉ fetch 1 lần dù gọi từ nhiều component (page + generateMetadata)
```

---

## Mapping chiến lược cho từng route

| Route | Chiến lược | Lý do |
|---|---|---|
| `(dashboard)/forms` | `no-store` | User thêm/xóa form → cần data mới nhất |
| `(builder)/forms/[id]/builder` | `no-store` | Đang edit → phải fresh |
| `(analytics)/forms/[id]/analytics` | `revalidate: 300` | Analytics ok stale 5 phút |
| `f/[formId]` | `revalidate: 3600` + `tags` | Public form ít đổi, invalidate khi publish |

---

## Streaming với Suspense

```tsx
// ✅ — Suspense riêng từng phần → stream độc lập
export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6 space-y-8">
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards formId={id} />
      </Suspense>
      <Suspense fallback={<FunnelSkeleton />}>
        <FunnelContainer formId={id} />
      </Suspense>
    </div>
  )
}

// ❌ — Wrap chung 1 Suspense → block nhau, mất lợi ích streaming
<Suspense fallback={<Loading />}>
  <SummaryCards formId={id} />
  <FunnelContainer formId={id} />
</Suspense>
```

---

## `loading.tsx` — Route-level loading

```tsx
// ✅ — Hiển thị ngay khi navigate, trước khi page.tsx fetch xong
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
