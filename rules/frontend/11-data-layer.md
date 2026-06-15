# 11 — Data Layer: Tập trung fetch, không gọi thẳng trong component

## Nguyên tắc cốt lõi

> **Không bao giờ gọi `fetch()` trực tiếp trong component, page, hay layout.**
> Mọi lời gọi API đều đi qua hàm tập trung trong `src/lib/data/` (server) hoặc `src/lib/api/` (client).

---

## Hai thư mục — hai môi trường

```
src/lib/
├── data/        ← Server-side: gọi từ Server Component, Server Action
│   ├── forms.ts
│   ├── analytics.ts
│   └── responses.ts
└── api/         ← Client-side: dùng làm queryFn / mutationFn trong TanStack Query
    ├── forms.ts
    ├── analytics.ts
    └── responses.ts
```

| | `src/lib/data/` | `src/lib/api/` |
|---|---|---|
| **Môi trường** | Server (Node.js) | Browser |
| **Dùng trong** | Server Component, Server Action | `queryFn`, `mutationFn` |
| **Auth** | Đọc cookie/header từ `next/headers` | Gửi cookie tự động (credentials) |
| **URL gốc** | `process.env.API_URL` (private) | `process.env.NEXT_PUBLIC_API_URL` |
| **Cache** | `React.cache()` + fetch cache options | TanStack Query cache |
| **Return type** | Data trực tiếp hoặc `null` | Data trực tiếp, throw khi lỗi |

---

## `src/lib/data/` — Server-side fetchers

### Quy tắc

- Wrap bằng `React.cache()` nếu cùng data có thể được gọi từ nhiều Server Component trong 1 request
- Luôn chỉ định cache strategy rõ ràng (`no-store` hoặc `next: { revalidate }`)
- Trả về `null` khi 404, throw khi lỗi khác
- Không dùng trong Client Component

```ts
// ✅ — src/lib/data/forms.ts
import { cache } from 'react'
import type { FormSchema } from '@flowform/types'

const API = process.env.API_URL  // server-only, không có NEXT_PUBLIC_

// Dùng cho Builder + generateMetadata — React.cache() dedup trong 1 request
export const getForm = cache(async (id: string): Promise<FormSchema | null> => {
  const res = await fetch(`${API}/api/forms/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getForm failed: ${res.status}`)
  return res.json()
})

// Dùng cho public form — cache dài, invalidate bằng tag
export const getPublicForm = cache(async (id: string): Promise<FormSchema | null> => {
  const res = await fetch(`${API}/api/forms/${id}`, {
    next: { revalidate: 3600, tags: [`form-${id}`] },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getPublicForm failed: ${res.status}`)
  return res.json()
})

// Dashboard: luôn fresh, không cần cache()
export async function getForms(): Promise<FormSchema[]> {
  const res = await fetch(`${API}/api/forms`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`getForms failed: ${res.status}`)
  return res.json()
}
```

```ts
// ✅ — src/lib/data/analytics.ts
import { cache } from 'react'
import type { FormSummary, FunnelStep } from '@flowform/types'

const API = process.env.API_URL

export const getAnalyticsSummary = cache(async (formId: string): Promise<FormSummary> => {
  const res = await fetch(`${API}/api/forms/${formId}/analytics/summary`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`getAnalyticsSummary failed: ${res.status}`)
  return res.json()
})

export const getFunnelData = cache(async (formId: string): Promise<FunnelStep[]> => {
  const res = await fetch(`${API}/api/forms/${formId}/analytics/funnel`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`getFunnelData failed: ${res.status}`)
  return res.json()
})
```

### Dùng trong Server Component

```tsx
// ✅ — page.tsx gọi qua lib/data, không gọi fetch trực tiếp
// src/app/(builder)/forms/[id]/builder/page.tsx
import { getForm } from '@/lib/data/forms'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const form = await getForm(id)  // ← lib/data, không phải fetch()
  return { title: form ? `Builder — ${form.title}` : 'Builder' }
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await getForm(id)  // ← cùng hàm, React.cache() → 0 network call thêm
  if (!form) notFound()
  return <BuilderShell initialForm={form} />
}
```

```tsx
// ❌ — Gọi fetch trực tiếp trong page
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await fetch(`${process.env.API_URL}/api/forms/${id}`).then(r => r.json()) // ❌
  return <BuilderShell initialForm={form} />
}
```

---

## `src/lib/api/` — Client-side API functions

### Quy tắc

- Chỉ dùng trong `queryFn` và `mutationFn` của TanStack Query
- Dùng `NEXT_PUBLIC_API_URL` (public env)
- Throw `Error` khi response không OK — TanStack Query tự bắt
- Không dùng trong Server Component

```ts
// ✅ — src/lib/api/forms.ts
import type { FormSchema } from '@flowform/types'
import type { CreateFormInput } from '@flowform/validators'

const API = process.env.NEXT_PUBLIC_API_URL

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const formsApi = {
  list: (): Promise<FormSchema[]> =>
    fetch(`${API}/api/forms`, { credentials: 'include' })
      .then(handleResponse<FormSchema[]>),

  get: (id: string): Promise<FormSchema> =>
    fetch(`${API}/api/forms/${id}`, { credentials: 'include' })
      .then(handleResponse<FormSchema>),

  create: (data: CreateFormInput): Promise<FormSchema> =>
    fetch(`${API}/api/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse<FormSchema>),

  update: (id: string, data: Partial<CreateFormInput>): Promise<FormSchema> =>
    fetch(`${API}/api/forms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse<FormSchema>),

  publish: (id: string): Promise<FormSchema> =>
    fetch(`${API}/api/forms/${id}/publish`, {
      method: 'PATCH',
      credentials: 'include',
    }).then(handleResponse<FormSchema>),

  delete: (id: string): Promise<void> =>
    fetch(`${API}/api/forms/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<void>),
}
```

### Dùng trong TanStack Query

```tsx
// ✅ — queryFn gọi qua lib/api, không gọi fetch trực tiếp
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useForm(id: string) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: () => formsApi.get(id),  // ← lib/api, không phải fetch()
  })
}

export function useDeleteForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),  // ← lib/api
    onSuccess: () => queryClient.invalidateQueries({ queryKey: formKeys.all }),
  })
}
```

```tsx
// ❌ — fetch trực tiếp trong queryFn
useQuery({
  queryKey: formKeys.detail(id),
  queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forms/${id}`)
    .then(r => r.json()),  // ❌ — phân tán logic, không tái sử dụng, không error handling nhất quán
})
```

---

## Quy tắc đặt tên hàm

| Pattern | Ví dụ |
|---|---|
| `get` + resource | `getForm`, `getForms`, `getPublicForm` |
| `get` + resource + qualifier | `getAnalyticsSummary`, `getFunnelData` |
| object `api` + verb | `formsApi.create`, `formsApi.update`, `formsApi.delete` |

Không dùng: `fetchForm`, `loadForms`, `requestForm`, `callFormApi`.

---

## Tổng hợp — ai gọi gì

```
Server Component / Server Action
  └── src/lib/data/*.ts  ──→  NestJS API (process.env.API_URL)

Client Component (TanStack Query)
  └── src/lib/api/*.ts   ──→  NestJS API (process.env.NEXT_PUBLIC_API_URL)

app/api/ Route Handlers       ← xem rule 12-route-handlers.md
```
