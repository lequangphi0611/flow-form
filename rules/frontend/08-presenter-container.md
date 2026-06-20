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
// src/components/forms/FormList/FormListContainer.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { FormList } from './FormList'
import { FormListSkeleton } from '../FormListSkeleton'
import { formKeys } from '@/lib/query-keys'

export function FormListContainer() {
  const { data: forms = [], isLoading, isError } = useQuery({
    queryKey: formKeys.all,
    queryFn: formsApi.list,  // ← lib/api, không phải fetch()
  })

  if (isLoading) return <FormListSkeleton />
  if (isError) return <p className="text-red-500">Không thể tải danh sách form.</p>

  return <FormList forms={forms} />  // toàn bộ layout nằm trong Presenter
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
// src/components/forms/FormList/FormList.tsx
import type { FormSchema } from '@flowform/types'
import { FormCard } from '@/components/forms/FormCard'

interface FormListProps {
  forms: FormSchema[]
  onDelete?: (id: string) => void
}

export function FormList({ forms, onDelete }: FormListProps) {
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
// src/components/forms/FormList/FormListContainer.tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormList } from './FormList'
import { FormListSkeleton } from '../FormListSkeleton'
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

  if (isLoading) return <FormListSkeleton />

  return (
    <FormList
      forms={forms}
      onDelete={(id) => deleteMutation.mutate(id)}  // callback xuống Presenter
    />
  )
}
```

> **Builder list items (`FieldCard`, `StepItem`…):** Vẫn tách Container/Presenter bình thường. Điểm khác biệt: `memo` đặt ở **Container** (không phải Presenter), và parent trong `.map()` chỉ truyền IDs — không truyền callbacks. Container tự đọc store bằng selector, inline arrows bên trong Container không phá vỡ memo. Xem rule 07 §4.

---

### 4. Builder module — Container + Store thay vì Container + API

Trong Builder, data đến từ Zustand store chứ không phải API trực tiếp. Container kết nối store và truyền xuống Presenter, nhưng list items KHÔNG nhận callbacks — chúng tự đọc store.

```tsx
// ✅ — FieldPanelContainer kết nối store, FieldPanel orchestrate DnD
// src/components/builder/FieldPanel/FieldPanelContainer.tsx
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
// src/components/builder/FieldPanel/FieldPanel.tsx

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

Mỗi component group (Presenter ± Container) được bọc trong **folder riêng** cùng tên với component:

```
components/[feature]/
└── [ComponentName]/                        ← folder bọc — luôn có
    ├── [ComponentName].tsx                 ← Presenter
    ├── [ComponentName]Container.tsx        ← Container (chỉ khi có side effect)
    └── index.ts                            ← Entry point — export public API
```

**`index.ts` — quy tắc export:**

```ts
// Có Container → export Container làm entry chính
export { LoginFormContainer } from './LoginFormContainer'

// Chỉ có Presenter → export Presenter trực tiếp
export { FormCard } from './FormCard'
```

**Ví dụ thực tế:**

```
components/
├── auth/
│   └── LoginForm/
│       ├── LoginForm.tsx               ← Presenter: nhận isPending, onSubmit
│       ├── LoginFormContainer.tsx      ← Container: gọi signIn.email(), router.push()
│       └── index.ts                    ← export { LoginFormContainer }
├── forms/
│   ├── FormList/
│   │   ├── FormList.tsx                ← Presenter: nhận forms[], onDelete
│   │   ├── FormListContainer.tsx       ← Container: useFormList, useDeleteForm
│   │   └── index.ts                    ← export { FormListContainer }
│   └── FormCard/
│       ├── FormCard.tsx                ← Presenter thuần (không có Container)
│       └── index.ts                    ← export { FormCard }
└── builder/
    └── FieldPanel/
        ├── FieldPanel.tsx              ← Presenter: orchestrate DnD
        ├── FieldPanelContainer.tsx     ← Container: useBuilderStore
        └── index.ts                    ← export { FieldPanelContainer }
```

**Page import từ folder — không import thẳng file bên trong:**

```tsx
// ✅
import { FormListContainer } from '@/components/forms/FormList'
import { FormCard } from '@/components/forms/FormCard'

// ❌
import { FormListContainer } from '@/components/forms/FormList/FormListContainer'
```

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
// ✅ — ĐÚNG: tách thành folder với 2 file + index
components/auth/RegisterForm/
├── RegisterForm.tsx              ← nhận { isPending, error, onSubmit } qua props
├── RegisterFormContainer.tsx     ← signUp.email(), router.push()
└── index.ts                      ← export { RegisterFormContainer }

app/(auth)/register/page.tsx      ← import { RegisterFormContainer } from '@/components/auth/RegisterForm'
```

```tsx
// ✅ — RegisterFormContainer
// src/components/auth/RegisterForm/RegisterFormContainer.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'
import { RegisterForm } from './RegisterForm'

export function RegisterFormContainer() {
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

```ts
// src/components/auth/RegisterForm/index.ts
export { RegisterFormContainer } from './RegisterFormContainer'
```

```tsx
// ✅ — RegisterForm (Presenter) — không biết signUp hay router tồn tại
// src/components/auth/RegisterForm/RegisterForm.tsx
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
| Component đọc từ Zustand store | ✅ Tạo Container |
| **Builder list items** (`FieldCard`, `StepItem`…) | ✅ Tạo Container — `memo` đặt ở Container, parent chỉ pass IDs (rule 07 §4) |
| Server Component async fetch | ✅ Server Component = Container tự nhiên |
| Component chỉ nhận props và render | ❌ Không cần Container, đây là Presenter |
| Component có `useState` UI đơn giản | ❌ Không cần Container (toggle, hover không tính) |
| Button nhỏ tự chứa (SignOutButton, CopyButton) | ❌ Không cần Container — đủ đơn giản để self-contain |

---

## Checklist trước khi viết Container

- [ ] `useQuery` / `useMutation` đã được tách ra custom hook tại `src/hooks/` — **không inline trong Container** (rule 04 §3)
- [ ] Container không có JSX layout phức tạp — chỉ gọi hook, xử lý loading/error, truyền data xuống Presenter
- [ ] Presenter không import bất kỳ thứ gì từ `@tanstack/react-query`, `@/store/`, hay `next/navigation`
