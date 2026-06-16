# 04 — TanStack Query (Client-side)

> Rule này chỉ nói về data fetching phía **client** bằng TanStack Query.
> - Server-side fetch, caching strategies → `10-nextjs-cache.md`
> - Tập trung hóa fetch functions (`lib/data/`, `lib/api/`) → `11-data-layer.md`
> - Error handling (isError, toast, error.tsx) → `13-error-handling.md`

---

## 1. Query key convention

Dùng array có cấu trúc phân cấp. Key phải **nhất quán** — mọi người dùng cùng convention.

```ts
// ✅ — Convention chuẩn
['forms']                          // danh sách tất cả forms
['forms', id]                      // 1 form cụ thể
['forms', id, 'analytics']         // analytics của form đó
['forms', id, 'responses']         // responses của form đó
['forms', id, 'responses', page]   // responses theo trang

// ❌ — Không nhất quán, khó invalidate
['all-forms']
['form-detail', id]
['form_analytics', id]
['getFormById', id]
```

### Tạo query key factory để tránh typo

```ts
// src/lib/query-keys.ts  ✅
export const formKeys = {
  all: ['forms'] as const,
  detail: (id: string) => ['forms', id] as const,
  analytics: (id: string) => ['forms', id, 'analytics'] as const,
  responses: (id: string) => ['forms', id, 'responses'] as const,
}

// Dùng:
useQuery({ queryKey: formKeys.detail(id), ... })
queryClient.invalidateQueries({ queryKey: formKeys.detail(id) })
```

---

## 2. Client Component fetch — luôn dùng `useQuery`

Không dùng `useEffect + fetch` thủ công trong Client Component.

```tsx
// ✅ — useQuery với queryFn qua lib/api (xem 11-data-layer.md)
// src/components/forms/containers/FormDetailContainer.tsx  ← đặt trong containers/ theo rule 09
'use client'

import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import { FormDetailSkeleton } from '@/components/forms/FormDetailSkeleton'
import { EmptyState } from '@/components/common/EmptyState'

export function FormDetailContainer({ formId }: { formId: string }) {
  const { data: form, isLoading, isError, refetch } = useQuery({
    queryKey: formKeys.detail(formId),
    queryFn: () => formsApi.get(formId),  // ← lib/api, không phải fetch()
  })

  if (isLoading) return <FormDetailSkeleton />
  if (isError) return (
    <EmptyState
      title="Không tải được form"
      action={<Button variant="outline" onClick={() => refetch()}>Thử lại</Button>}
    />
  )
  return <FormDetail form={form} />
}
```

```tsx
// ❌ — useEffect + fetch thủ công: không có cache, không re-fetch thông minh
'use client'

export function FormDetailContainer({ formId }: { formId: string }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forms/${formId}`)  // ❌ fetch trực tiếp
      .then(r => r.json())
      .then(setData)
  }, [formId])
  // Không có loading state, error state, cache, hay invalidation
}
```

---

## 3. Mutation pattern

```tsx
// ✅ — Pattern chuẩn: mutate → toast → invalidate → UI tự cập nhật
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import type { FormSchema } from '@flowform/types'

export function useUpdateFormSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { id: string; settings: FormSchema['settings'] }) =>
      formsApi.update(payload.id, { settings: payload.settings }),  // ← lib/api

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: formKeys.detail(variables.id) })
      toast.success('Đã lưu cài đặt')
    },

    onError: () => {
      toast.error('Lưu thất bại, thử lại sau')
    },
  })
}

// Dùng trong component:
function SettingsPanel({ form }: { form: FormSchema }) {
  const { mutate, isPending } = useUpdateFormSettings()

  return (
    <button
      onClick={() => mutate({ id: form.id, settings: form.settings })}
      disabled={isPending}
    >
      {isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
    </button>
  )
}
```

---

## 4. Optimistic update — dùng cho Builder auto-save

Auto-save trong Builder không cần chờ server. Dùng optimistic để UX mượt.

```tsx
// ✅ — Optimistic update cho auto-save
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import type { FormSchema } from '@flowform/types'

export function useAutoSaveForm(formId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: FormSchema) =>
      formsApi.update(formId, form),  // ← lib/api, không fetch() trực tiếp

    onMutate: async (newForm) => {
      // Cancel inflight queries tránh overwrite
      await queryClient.cancelQueries({ queryKey: formKeys.detail(formId) })

      // Snapshot để rollback nếu lỗi
      const previousForm = queryClient.getQueryData<FormSchema>(formKeys.detail(formId))

      // Optimistic update cache ngay lập tức
      queryClient.setQueryData(formKeys.detail(formId), newForm)

      return { previousForm }
    },

    onError: (_err, _newForm, context) => {
      // Rollback nếu server lỗi
      if (context?.previousForm) {
        queryClient.setQueryData(formKeys.detail(formId), context.previousForm)
      }
    },

    onSettled: () => {
      // Sau cùng luôn sync lại với server
      queryClient.invalidateQueries({ queryKey: formKeys.detail(formId) })
    },
  })
}
```
