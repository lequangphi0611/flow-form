# 13 — Error Handling

## Phân loại lỗi và nơi xử lý

| Loại lỗi | Xử lý ở đâu | Công cụ |
|---|---|---|
| Route crash (throw trong Server Component) | `error.tsx` | Next.js Error Boundary |
| 404 (resource không tồn tại) | `not-found.tsx` + `notFound()` | Next.js |
| Query thất bại | `isError` + fallback UI trong component | TanStack Query |
| Mutation thất bại | Toast + giữ nguyên form | `sonner` + TanStack Query |
| Form validation | Inline dưới field | React Hook Form + Zod |
| Server Action thất bại | Return error object, hiển thị trong form | `useActionState` |
| Lỗi không bắt được | Global error boundary | `app/global-error.tsx` |

---

## 1. `error.tsx` — Route-level error boundary

Đặt `error.tsx` cạnh `page.tsx` của từng route group. Bắt mọi lỗi throw trong Server Component của route đó.

```tsx
// ✅ — src/app/(dashboard)/forms/error.tsx
'use client'  // bắt buộc — error.tsx luôn là Client Component

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FormsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log lỗi ra console (hoặc gửi lên error tracking service sau này)
    console.error('[FormsPage]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
      <p className="text-lg font-medium text-gray-800">Không tải được danh sách form</p>
      <p className="text-sm text-gray-500 max-w-sm">
        Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu vấn đề tiếp tục.
      </p>
      <Button variant="outline" onClick={reset}>Thử lại</Button>
    </div>
  )
}
```

**Quy tắc:**
- Mỗi route group có 1 `error.tsx` riêng — lỗi ở `(builder)` không ảnh hưởng `(dashboard)`
- `error.tsx` luôn là `'use client'`
- Phải có nút **Thử lại** gọi `reset()`
- Log lỗi trong `useEffect`, không hiển thị message kỹ thuật cho user

---

## 2. `not-found.tsx` + `notFound()` — 404

```tsx
// ✅ — src/lib/data/forms.ts — throw notFound khi resource không tồn tại
import { notFound } from 'next/navigation'

export const getForm = cache(async (id: string) => {
  const res = await fetch(`${process.env.API_URL}/api/forms/${id}`, { cache: 'no-store' })
  if (res.status === 404) notFound()   // redirect đến not-found.tsx gần nhất
  if (!res.ok) throw new Error(`getForm failed: ${res.status}`)
  return res.json() as Promise<FormSchema>
})
```

```tsx
// ✅ — src/app/(builder)/forms/[id]/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FormNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
      <p className="text-lg font-medium text-gray-800">Form không tồn tại</p>
      <p className="text-sm text-gray-500">Form này đã bị xóa hoặc link không đúng.</p>
      <Button asChild variant="outline">
        <Link href="/forms">Quay về danh sách form</Link>
      </Button>
    </div>
  )
}
```

**Quy tắc:**
- Dùng `notFound()` từ `next/navigation` — không throw Error thủ công cho 404
- `notFound()` trong `lib/data/` — không kiểm tra null ở từng page
- Tạo `not-found.tsx` trong route group liên quan, không chỉ ở root

---

## 3. TanStack Query — component-level error

```tsx
// ✅ — isError trong component
'use client'

import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import { FormGrid, FormGridSkeleton } from '@/components/forms'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'

export function FormListContainer() {
  const { data: forms, isLoading, isError, refetch } = useQuery({
    queryKey: formKeys.all,
    queryFn: formsApi.list,
  })

  if (isLoading) return <FormGridSkeleton />

  if (isError) {
    return (
      <EmptyState
        title="Không tải được danh sách form"
        description="Kiểm tra kết nối mạng và thử lại."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    )
  }

  if (!forms?.length) {
    return (
      <EmptyState
        title="Chưa có form nào"
        description="Tạo form đầu tiên để bắt đầu thu thập dữ liệu."
      />
    )
  }

  return <FormGrid forms={forms} />
}
```

**Quy tắc:**
- Luôn xử lý `isLoading`, `isError`, empty state — không bỏ sót trường hợp nào
- Phân biệt **lỗi** (isError) và **rỗng** (data.length === 0) — 2 UI khác nhau
- `isError` → show message + nút retry (`refetch`)
- Không `console.log(error)` trong render — chỉ log trong `useEffect`

---

## 4. Mutation — Toast notification

Cài `sonner` để hiển thị toast. Đây là thư viện toast mặc định của shadcn/ui.

```bash
# Cài sonner (1 lần duy nhất)
npm install sonner --workspace=@flowform/web
npx shadcn add sonner
```

```tsx
// ✅ — src/components/providers.tsx — thêm Toaster
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ ... }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  )
}
```

```tsx
// ✅ — Pattern chuẩn: toast trong onSuccess / onError của mutation
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useDeleteForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.all })
      toast.success('Đã xóa form')
    },

    onError: (error) => {
      toast.error('Xóa form thất bại', {
        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
      })
    },
  })
}
```

```tsx
// ✅ — isPending cho loading state trong button
function DeleteFormButton({ formId }: { formId: string }) {
  const { mutate, isPending } = useDeleteForm()

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => mutate(formId)}
    >
      {isPending ? 'Đang xóa...' : 'Xóa'}
    </Button>
  )
}
```

**Quy tắc:**
- `onSuccess` → `toast.success(...)` + `invalidateQueries`
- `onError` → `toast.error(...)` — không alert, không console.error trong UI
- Button disabled khi `isPending` — không cho double submit
- Không hiển thị error message kỹ thuật (stack trace) cho user

---

## 5. Form validation — Inline errors

Chi tiết trong `05-forms.md`. Tóm tắt nhanh:

```tsx
// ✅ — Error hiển thị ngay dưới field liên quan
<FormField label="Tiêu đề" error={errors.title?.message} required>
  <Input {...register('title')} aria-invalid={!!errors.title} />
</FormField>

// ✅ — Summary error ở đầu form khi submit thất bại (nhiều lỗi cùng lúc)
{Object.keys(errors).length > 0 && (
  <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
    Vui lòng kiểm tra lại các trường được đánh dấu màu đỏ.
  </div>
)}
```

---

## 6. Server Action — return error, không throw

```tsx
// ✅ — src/app/actions/form.actions.ts
'use server'

import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function publishFormAction(formId: string): Promise<ActionResult<void>> {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Chưa đăng nhập' }

  // 2. Gọi API
  const res = await fetch(`${process.env.API_URL}/api/forms/${formId}/publish`, {
    method: 'PATCH',
    cache: 'no-store',
  })

  if (!res.ok) return { success: false, error: 'Xuất bản thất bại, thử lại sau' }

  // 3. Revalidate cache
  revalidateTag(`form-${formId}`)

  return { success: true, data: undefined }
}
```

```tsx
// ✅ — Gọi Server Action trong Client Component
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { publishFormAction } from '@/app/actions/form.actions'

export function PublishButton({ formId }: { formId: string }) {
  const [isPending, startTransition] = useTransition()

  function handlePublish() {
    startTransition(async () => {
      const result = await publishFormAction(formId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Form đã được xuất bản!')
    })
  }

  return (
    <Button onClick={handlePublish} disabled={isPending}>
      {isPending ? 'Đang xuất bản...' : 'Xuất bản'}
    </Button>
  )
}
```

**Quy tắc:**
- Server Action return `{ success: boolean, error?: string }` — không throw
- Client kiểm tra `result.success` và hiển thị toast tương ứng
- Dùng `useTransition` để track pending state của Server Action

---

## 7. `global-error.tsx` — Lỗi không bắt được

```tsx
// ✅ — src/app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">Đã xảy ra lỗi</h1>
          <p className="text-gray-500">Vui lòng làm mới trang và thử lại.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  )
}
```

**Lưu ý:** `global-error.tsx` thay thế hoàn toàn `layout.tsx` root — phải tự render `<html>` và `<body>`.

---

## Những điều KHÔNG làm

```tsx
// ❌ — Nuốt lỗi im lặng
try {
  await formsApi.delete(id)
} catch {
  // không làm gì → user không biết có lỗi
}
```

```tsx
// ❌ — Hiển thị error kỹ thuật cho user
toast.error(error.stack)  // stack trace không có ý nghĩa với user
```

```tsx
// ❌ — Alert thay vì toast
window.alert('Xóa thất bại!')  // block UI, trải nghiệm tệ
```

```tsx
// ❌ — Không handle isError trong query
const { data } = useQuery(...)
return <div>{data.title}</div>  // crash nếu data undefined do lỗi
```

```tsx
// ❌ — throw trong Server Action
export async function deleteForm(id: string) {
  const res = await fetch(...)
  if (!res.ok) throw new Error('Failed')  // ❌ client không bắt được typed error
}
```
