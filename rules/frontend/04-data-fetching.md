# 04 — TanStack Query (Client-side)

> **Trước tiên đọc `21-fetch-strategy.md`**: client là lựa chọn **cuối cùng**, không
> phải mặc định. Server-first — chỉ dùng TanStack Query khi data phụ thuộc tương tác,
> cần invalidate sau mutation cùng trang, hoặc realtime. Rule này chỉ nói **cách làm**
> khi đã quyết định là Client (hoặc phần client của Hybrid).
>
> - Chọn Server / Hybrid / Client → `21-fetch-strategy.md`
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
  root: ['forms'] as const,                              // prefix — dùng để invalidate tất cả form queries
  all: (userId: string) => ['forms', userId] as const,  // danh sách của 1 user
  detail: (id: string) => ['forms', id] as const,
  analytics: (id: string) => ['forms', id, 'analytics'] as const,
  responses: (id: string) => ['forms', id, 'responses'] as const,
}

// Dùng:
useQuery({ queryKey: formKeys.all(userId), ... })
useQuery({ queryKey: formKeys.detail(id), ... })
queryClient.invalidateQueries({ queryKey: formKeys.root })          // invalidate tất cả
queryClient.invalidateQueries({ queryKey: formKeys.detail(id) })    // invalidate 1 form
```

---

## 2. Client Component fetch — luôn dùng custom hook bọc `useQuery`

Không dùng `useEffect + fetch` thủ công. Không viết `useQuery(...)` trực tiếp trong component hay container — phải bọc trong custom hook tại `src/hooks/`.

```ts
// src/hooks/forms/useFormDetail.ts  ✅
import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useFormDetail(formId: string) {
  return useQuery({
    queryKey: formKeys.detail(formId),
    queryFn: () => formsApi.get(formId),
  })
}
```

```tsx
// src/components/forms/containers/FormDetailContainer.tsx  ✅
'use client'

import { useFormDetail } from '@/hooks/forms/useFormDetail'
import { FormDetailSkeleton } from '@/components/forms/FormDetailSkeleton'
import { EmptyState } from '@/components/common/EmptyState'

export function FormDetailContainer({ formId }: { formId: string }) {
  const { data: form, isLoading, isError, refetch } = useFormDetail(formId)

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
// ❌ — useQuery inline trong container
export function FormDetailContainer({ formId }: { formId: string }) {
  const { data: form } = useQuery({          // ❌ không bọc trong hook
    queryKey: formKeys.detail(formId),
    queryFn: () => formsApi.get(formId),
  })
}

// ❌ — useEffect + fetch thủ công
export function FormDetailContainer({ formId }: { formId: string }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(`/api/forms/${formId}`).then(r => r.json()).then(setData)  // ❌ không cache, không error state
  }, [formId])
}
```

---

## 3. Query và Mutation hooks — BẮT BUỘC tách ra custom hook

Mọi `useQuery` và `useMutation` call phải nằm trong một **custom hook riêng** đặt tại `src/hooks/`.
Không được viết `useQuery(...)` hay `useMutation(...)` trực tiếp trong component hay container.

**Lý do:**
- Query/mutation config (queryKey, queryFn, invalidation, error) dùng lại được nhiều nơi
- Container chỉ orchestrate, không chứa query config
- Dễ test hook độc lập

**Naming:**
- Query: `use[Entity]` hoặc `use[Entity]List` — ví dụ: `useFormList`, `useFormDetail`
- Mutation: `use[Action][Entity]` — ví dụ: `useDeleteForm`, `useCreateForm`, `useUpdateFormSettings`

**Đặt file:** `src/hooks/[entity]/use[Name].ts`
```
src/hooks/forms/useFormList.ts         ← useQuery danh sách
src/hooks/forms/useFormDetail.ts       ← useQuery 1 form
src/hooks/forms/useDeleteForm.ts       ← useMutation xóa
src/hooks/forms/useCreateForm.ts       ← useMutation tạo
```

**Khi `onSuccess` cần gọi logic của component** (setState, router.push...) → nhận vào qua callback param:

```ts
// src/hooks/forms/useDeleteForm.ts  ✅
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useDeleteForm(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.root })
      options?.onSuccess?.()
    },
  })
}

// Container dùng:  ✅
const { mutate: deleteForm, isPending: isDeleting } = useDeleteForm({
  onSuccess: () => setDeletingFormId(null),
})
```

```tsx
// ❌ — useMutation inline trong container
const { mutate: deleteForm } = useMutation({
  mutationFn: (id: string) => formsApi.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: formKeys.all })
    setDeletingFormId(null)  // ❌ component state lẫn vào mutation config
  },
})
```

---

## 4. Mutation pattern — ví dụ đầy đủ

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

## 5. Query key cho user-scoped data — bắt buộc include userId

**Bối cảnh phát hiện:** `queryKey: ['forms']` không gắn với user cụ thể. Nếu user A và user B dùng cùng browser (đăng nhập lần lượt), user B thấy cache data của user A trong suốt `staleTime` (mặc định 60 giây).

Mọi query trả về dữ liệu thuộc về 1 user cụ thể **phải include `userId`** trong query key. Lấy `userId` từ `useSession()`.

```ts
// src/lib/query-keys.ts  ✅ — all() nhận userId
export const formKeys = {
  all: (userId: string) => ['forms', userId] as const,
  detail: (id: string) => ['forms', id] as const,
  analytics: (id: string) => ['forms', id, 'analytics'] as const,
  responses: (id: string) => ['forms', id, 'responses'] as const,
}
```

```ts
// src/hooks/forms/useFormList.ts  ✅
import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import { useCurrentUser } from '@/hooks/auth/useCurrentUser'

export function useFormList() {
  const { data } = useCurrentUser()         // TanStack Query wrapper — đã cache, không refetch mỗi render
  const userId = data?.user?.id ?? ''

  return useQuery({
    queryKey: formKeys.all(userId),
    queryFn: formsApi.list,
    enabled: !!userId,   // không fetch khi chưa có session
  })
}
```

```ts
// src/lib/query-keys.ts  ❌ — thiếu root key → phải dùng magic string để invalidate
export const formKeys = {
  all: ['forms'] as const,  // ❌ không scope theo user + không có root key riêng
}

// src/hooks/forms/useFormList.ts  ❌
export function useFormList() {
  return useQuery({
    queryKey: formKeys.all,    // ❌ không scope theo user
    queryFn: formsApi.list,
    // ❌ thiếu enabled: !!userId → fetch ngay cả khi chưa đăng nhập
  })
}

// ❌ — raw string thay vì dùng formKeys
queryClient.invalidateQueries({ queryKey: ['forms'] })
```

**Invalidation dùng `formKeys.root` — prefix match tất cả variants:**

```ts
// ✅ — Invalidate tất cả form queries (mọi user) — dùng trong mutation không biết userId
queryClient.invalidateQueries({ queryKey: formKeys.root })

// ✅ — Invalidate chỉ list của 1 user cụ thể
queryClient.invalidateQueries({ queryKey: formKeys.all(userId) })
```

TanStack Query dùng prefix matching: `formKeys.root` (`['forms']`) match `['forms', userId]`, `['forms', id]`, `['forms', id, 'analytics']`... Invalidation bằng prefix là đúng và đủ — không cần truyền userId vào invalidation nếu muốn clear tất cả.

**Phân loại query key:**

| Loại data | Query key pattern | Ghi chú |
|---|---|---|
| Danh sách thuộc về user | `['forms', userId]` | userId bắt buộc |
| Chi tiết 1 resource | `['forms', formId]` | formId đã unique — không cần userId |
| Sub-resource | `['forms', formId, 'responses']` | formId đã scope đủ |
| Data không thuộc user | `['public-forms', formId]` | Không cần userId |

---

## 6. Optimistic update — dùng cho Builder auto-save

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
