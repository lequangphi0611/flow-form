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
| **URL gốc** | `process.env.API_URL` (private) | `process.env.NEXT_PUBLIC_API_URL` |
| **Cache** | `React.cache()` + fetch cache options | TanStack Query cache |

---

## `src/lib/data/` — Server-side fetchers

```ts
// ✅ — src/lib/data/forms.ts
import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { FormSchema } from '@flowform/types'

const API = process.env.API_URL

export const getForm = cache(async (id: string): Promise<FormSchema> => {
  const res = await fetch(`${API}/api/forms/${id}`, { cache: 'no-store' })
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`getForm failed: ${res.status}`)
  return res.json()
})

export const getPublicForm = cache(async (id: string): Promise<FormSchema> => {
  const res = await fetch(`${API}/api/forms/${id}`, {
    next: { revalidate: 3600, tags: [`form-${id}`] },
  })
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`getPublicForm failed: ${res.status}`)
  return res.json()
})

export async function getForms(): Promise<FormSchema[]> {
  const res = await fetch(`${API}/api/forms`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`getForms failed: ${res.status}`)
  return res.json()
}
```

```tsx
// ✅ — page.tsx gọi qua lib/data, không gọi fetch trực tiếp
import { getForm } from '@/lib/data/forms'

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await getForm(id)  // 404 → notFound() tự động
  return <BuilderShell initialForm={form} />
}

// ❌ — fetch trực tiếp trong page
const form = await fetch(`${process.env.API_URL}/api/forms/${id}`).then(r => r.json()) // ❌
```

---

## `src/lib/api/` — Client-side API functions

```ts
// ✅ — src/lib/api/forms.ts
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
    fetch(`${API}/api/forms`, { credentials: 'include' }).then(handleResponse<FormSchema[]>),

  get: (id: string): Promise<FormSchema> =>
    fetch(`${API}/api/forms/${id}`, { credentials: 'include' }).then(handleResponse<FormSchema>),

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

```tsx
// ✅ — queryFn gọi qua lib/api, không gọi fetch trực tiếp
useQuery({
  queryKey: formKeys.detail(id),
  queryFn: () => formsApi.get(id),  // ← lib/api
})

// ❌ — fetch trực tiếp trong queryFn
useQuery({
  queryKey: formKeys.detail(id),
  queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forms/${id}`).then(r => r.json()),  // ❌
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
```
