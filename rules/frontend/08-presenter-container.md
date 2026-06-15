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

### 1. Container — chỉ orchestrate, không layout

Container không viết JSX layout phức tạp. Nó lấy data và truyền xuống Presenter.

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

---

### 4. Builder module — Container + Store thay vì Container + API

Trong Builder, data đến từ Zustand store chứ không phải API trực tiếp.

```tsx
// ✅ — BuilderCanvasContainer kết nối store, StepCanvas chỉ render
// src/components/builder/containers/BuilderCanvasContainer.tsx
'use client'

import { useBuilderStore } from '@/store/builder.store'
import { StepCanvas } from '../StepCanvas'

export function BuilderCanvasContainer() {
  const form = useBuilderStore((s) => s.form)
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const updateField = useBuilderStore((s) => s.updateField)

  if (!form) return null

  const activeStep = form.steps.find((s) => s.id === selectedStepId) ?? form.steps[0]

  return (
    <StepCanvas
      step={activeStep}
      onUpdateField={(fieldId, updates) =>
        updateField(activeStep.id, fieldId, updates)
      }
    />
  )
}
```

```tsx
// ✅ — StepCanvas: Presenter thuần, không biết Zustand tồn tại
// src/components/builder/StepCanvas.tsx
import type { StepSchema, FieldSchema } from '@flowform/types'
import { FieldRenderer } from './FieldRenderer'

interface StepCanvasProps {
  step: StepSchema
  onUpdateField: (fieldId: string, updates: Partial<FieldSchema>) => void
}

export function StepCanvas({ step, onUpdateField }: StepCanvasProps) {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold">{step.title}</h2>
      {step.fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          onUpdate={(updates) => onUpdateField(field.id, updates)}
        />
      ))}
    </div>
  )
}
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

## Tóm tắt — khi nào tạo Container

| Tình huống | Tạo Container? |
|---|---|
| Component cần `useQuery` | ✅ Tạo Container |
| Component cần `useMutation` | ✅ Tạo Container |
| Component đọc từ Zustand store | ✅ Tạo Container (hoặc bản thân nó là Container) |
| Server Component async fetch | ✅ Server Component = Container tự nhiên |
| Component chỉ nhận props và render | ❌ Không cần Container, đây là Presenter |
| Component có `useState` UI đơn giản | ❌ Không cần Container (toggle, hover không tính) |
