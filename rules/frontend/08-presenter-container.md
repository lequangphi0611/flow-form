# 08 — Pattern Presenter / Container

## Khái niệm

| | Container (Smart) | Presenter (Dumb) |
|---|---|---|
| **Trách nhiệm** | Fetch data, kết nối store, xử lý mutation | Render UI thuần từ props |
| **Biết về API?** | Có (`useQuery`, `useMutation`, Server fetch) | Không |
| **Biết về Zustand?** | Có (`useBuilderStore`, `useSession`) | Không |
| **Có side effects?** | Có (`useEffect`, `onSuccess`) | Không |
| **Reusable?** | Thấp — gắn với feature | Cao — dùng lại tự do |
| **Tên file** | `FormListContainer.tsx` | `FormCard.tsx` |
| **Testable?** | Cần mock API/store | Chỉ cần truyền props |

---

## Quy tắc

### 1. Container — chỉ orchestrate, không layout, không inline query

Container không viết JSX layout phức tạp. Nó lấy data và truyền xuống Presenter.

> **`useQuery` và `useMutation` không được viết inline trong Container.** Phải tách ra custom hook tại `src/hooks/[entity]/use[Name].ts` rồi gọi hook đó trong Container. (→ rule 04 §3)

```tsx
// ✅ — Container thin: lấy data, truyền xuống Presenter
// src/components/forms/containers/FormListContainer.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { FormGrid } from '../FormGrid'
import { FormGridSkeleton } from '../FormGridSkeleton'
import { formKeys } from '@/lib/query-keys'

export function FormListContainer() {
  const { data: forms = [], isLoading, isError } = useQuery({
    queryKey: formKeys.all,
    queryFn: formsApi.list,  // ← lib/api, không phải fetch()
  })

  if (isLoading) return <FormGridSkeleton />
  if (isError) return <p className="text-red-500">Không thể tải danh sách form.</p>

  return <FormGrid forms={forms} />  // toàn bộ layout nằm trong Presenter
}
```

```tsx
// ❌ — Container vừa fetch vừa layout chi tiết
export function FormListContainer() {
  const { data: forms = [] } = useQuery(...)

  return (
    // ❌ Container đang làm việc của Presenter
    <div className="grid grid-cols-3 gap-4 p-6">
      {forms.map((form) => (
        <div key={form.id} className="border rounded-lg p-4 hover:shadow">
          <h3 className="font-semibold">{form.title}</h3>
          <p className="text-sm text-gray-500">{form.description}</p>
          <span>{form.published ? 'Đã xuất bản' : 'Nháp'}</span>
        </div>
      ))}
    </div>
  )
}
```

---

### 2. Presenter — nhận đủ data qua props, không tự fetch

```tsx
// ✅ — Presenter thuần: chỉ render, không biết data đến từ đâu
// src/components/forms/FormGrid.tsx
import type { FormSchema } from '@flowform/types'
import { FormCard } from './FormCard'

interface FormGridProps {
  forms: FormSchema[]
  onDelete?: (id: string) => void
}

export function FormGrid({ forms, onDelete }: FormGridProps) {
  if (forms.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Chưa có form nào. Tạo form đầu tiên!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form) => (
        <FormCard key={form.id} form={form} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

```tsx
// ❌ — Presenter tự fetch data
export function FormGrid() {
  const { data: forms } = useQuery(...)  // ❌ Presenter không được tự fetch

  return (
    <div className="grid ...">
      {forms?.map((form) => <FormCard key={form.id} form={form} />)}
    </div>
  )
}
```

---

### 3. Callback từ Container xuống Presenter

Mutation logic ở Container, Presenter chỉ gọi callback.

```tsx
// ✅ — Container giữ mutation, truyền callback xuống
// src/components/forms/containers/FormListContainer.tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormGrid } from '../FormGrid'
import { formKeys } from '@/lib/query-keys'

export function FormListContainer() {
  const queryClient = useQueryClient()

  const { data: forms = [], isLoading } = useQuery({
    queryKey: formKeys.all,
    queryFn: formsApi.list,  // ← lib/api
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsApi.delete(id),  // ← lib/api
    onSuccess: () => queryClient.invalidateQueries({ queryKey: formKeys.all }),
  })

  if (isLoading) return <FormGridSkeleton />

  return (
    <FormGrid
      forms={forms}
      onDelete={(id) => deleteMutation.mutate(id)}  // callback xuống Presenter
    />
  )
}
```

> ⚠️ **Ngoại lệ Builder — list items:** `FieldCard`, `StepItem` và các list items trong Builder **KHÔNG** nhận callbacks từ Container hay Presenter. Thay vào đó, chúng nhận IDs và tự đọc data từ store qua selector, gọi store actions trực tiếp. Lý do: callbacks inline trong `.map()` tạo reference mới mỗi render → `React.memo` vô nghĩa. Xem rule 07 §4.

---

### 4. Builder module — Container + Store thay vì Container + API

Trong Builder, data đến từ Zustand store chứ không phải API trực tiếp. Container kết nối store và truyền xuống Presenter, nhưng list items KHÔNG nhận callbacks — chúng tự đọc store.

```tsx
// ✅ — FieldPanelContainer kết nối store, FieldPanel orchestrate DnD
// src/components/builder/containers/FieldPanelContainer.tsx
'use client'

import { useBuilderStore } from '@/store/builder.store'
import { FieldPanel } from '../FieldPanel'

export function FieldPanelContainer() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const activeStep = useBuilderStore((s) =>
    s.form?.steps.find((step) => step.id === s.selectedStepId)
  )
  const addField = useBuilderStore((s) => s.addField)
  const reorderFields = useBuilderStore((s) => s.reorderFields)

  if (!selectedStepId || !activeStep) return null

  return (
    <FieldPanel
      stepId={selectedStepId}
      stepTitle={activeStep.title}
      fields={activeStep.fields}
      onAddField={(type) => addField(selectedStepId, type)}
      onReorderFields={(from, to) => reorderFields(selectedStepId, from, to)}
    />
  )
}
```

```tsx
// ✅ — FieldPanel: Presenter — orchestrate DnD, list items chỉ nhận IDs
// src/components/builder/FieldPanel.tsx

// Key: KHÔNG truyền onUpdateField, onDeleteField xuống FieldCard
// FieldCard tự đọc field từ store, gọi store actions trực tiếp
{fields.map((field) => (
  <FieldCard key={field.id} stepId={stepId} fieldId={field.id} />
))}
```

```tsx
// ❌ — SAI: Container truyền callbacks, Presenter tạo inline callbacks trong .map()
export function BuilderCanvasContainer() {
  const updateField = useBuilderStore((s) => s.updateField)
  const activeStep = useBuilderStore((s) => ...)  // tạo object mới mỗi khi store đổi

  return (
    <StepCanvas
      step={activeStep}                                           // ← new ref mỗi render
      onUpdateField={(fieldId, updates) =>                       // ← new fn ref mỗi render
        updateField(activeStep.id, fieldId, updates)
      }
    />
  )
}

// StepCanvas:
{step.fields.map((field) => (
  <FieldRenderer
    key={field.id}
    field={field}
    onUpdate={(updates) => onUpdateField(field.id, updates)}  // ← new fn ref mỗi render
  />
))}
// → memo trên FieldRenderer vô nghĩa, toàn bộ list re-render khi bất kỳ field nào thay đổi
```

---

### 5. Server Component làm Container — không cần `'use client'`

```tsx
// ✅ — Server Component là Container tự nhiên (async, fetch thẳng qua lib/data)
// src/app/(dashboard)/forms/page.tsx
import { getForms } from '@/lib/data/forms'  // ← lib/data, xem 11-data-layer.md
import { FormGrid } from '@/components/forms/FormGrid'

export default async function FormsPage() {
  const forms = await getForms()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Form của tôi</h1>
      <FormGrid forms={forms} />  {/* Truyền thẳng xuống Presenter */}
    </div>
  )
}
```

---

## Cấu trúc thư mục

> Xem `09-atomic-design.md` để biết cấu trúc đầy đủ.
> Container nằm trong subfolder `containers/` của từng feature:
> ```
> components/[feature]/
> ├── containers/
> │   └── [Feature]Container.tsx   ← Container
> └── [Feature].tsx                ← Presenter
> ```

---

---

### 6. Auth forms — ví dụ thực tế hay bị vi phạm

`signUp.email()`, `signIn.email()`, `router.push()` đều là side effects → **bắt buộc tách Container**.

```tsx
// ❌ — SAI: 1 component vừa gọi signUp.email() vừa render form
// app/(auth)/register/_components/RegisterForm.tsx
'use client'

export function RegisterForm() {
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await signUp.email({ email, password, name })  // ← Container logic
    if (!error) router.push('/forms')                                  // ← Container logic
  }

  return (
    <form onSubmit={handleSubmit}>  {/* ← Presenter logic — bị trộn lẫn */}
      ...
    </form>
  )
}
// Vi phạm: 1 file làm việc của cả Container lẫn Presenter
```

```
// ✅ — ĐÚNG: tách thành 2 file
components/auth/containers/RegisterContainer.tsx  ← signUp.email(), router.push()
components/auth/RegisterForm.tsx                  ← nhận { isPending, error, onSubmit } qua props
app/(auth)/register/page.tsx                      ← chỉ import RegisterContainer
```

```tsx
// ✅ — RegisterContainer
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'
import { RegisterForm } from '../RegisterForm'

export function RegisterContainer() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(name: string, email: string, password: string) {
    setIsPending(true)
    setError(null)
    const { error: signUpError } = await signUp.email({ name, email, password })
    if (signUpError) {
      setError('Đăng ký thất bại, thử lại sau')
      setIsPending(false)
      return
    }
    router.push('/forms')
  }

  return <RegisterForm isPending={isPending} error={error} onSubmit={handleSubmit} />
}
```

```tsx
// ✅ — RegisterForm (Presenter) — không biết signUp hay router tồn tại
interface RegisterFormProps {
  isPending: boolean
  error: string | null
  onSubmit: (name: string, email: string, password: string) => void
}

export function RegisterForm({ isPending, error, onSubmit }: RegisterFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })
  // ... render form, gọi onSubmit qua props
}
```

---

## Tóm tắt — khi nào tạo Container

| Tình huống | Tạo Container? |
|---|---|
| Component cần `useQuery` | ✅ Tạo Container |
| Component cần `useMutation` | ✅ Tạo Container |
| Component gọi `signIn.email()` / `signUp.email()` | ✅ Tạo Container |
| Component gọi `router.push()` sau side effect | ✅ Tạo Container |
| Component đọc từ Zustand store (ngoài Builder list items) | ✅ Tạo Container |
| **Builder list items** (`FieldCard`, `StepItem`…) đọc store trực tiếp | ❌ Không cần Container — pattern rule 07 §4 |
| Server Component async fetch | ✅ Server Component = Container tự nhiên |
| Component chỉ nhận props và render | ❌ Không cần Container, đây là Presenter |
| Component có `useState` UI đơn giản | ❌ Không cần Container (toggle, hover không tính) |
| Button nhỏ tự chứa (SignOutButton, CopyButton) | ❌ Không cần Container — đủ đơn giản để self-contain |

---

## Checklist trước khi viết Container

- [ ] `useQuery` / `useMutation` đã được tách ra custom hook tại `src/hooks/` — **không inline trong Container** (rule 04 §3)
- [ ] Container không có JSX layout phức tạp — chỉ gọi hook, xử lý loading/error, truyền data xuống Presenter
- [ ] Presenter không import bất kỳ thứ gì từ `@tanstack/react-query`, `@/store/`, hay `next/navigation`
