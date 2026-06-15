# 05 — Quy tắc viết Forms với React Hook Form + Zod

## 1. Schema trước, form sau

Luôn định nghĩa Zod schema **trước** khi viết component form.
- Schema dùng lại được ở nhiều nơi (client validation + server validation)
- Schema ở `@flowform/validators` nếu cần share với backend
- Schema ở file riêng trong feature folder nếu chỉ dùng ở frontend

```ts
// ✅ — packages/validators/src/form.schema.ts (đã có sẵn, dùng lại)
import { createFormSchema, type CreateFormInput } from '@flowform/validators'

// ✅ — Hoặc tạo schema riêng cho UI form nhỏ
// src/components/builder/schemas/step-settings.schema.ts
import { z } from 'zod'

export const stepSettingsSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(100),
  description: z.string().max(500).optional(),
})

export type StepSettingsInput = z.infer<typeof stepSettingsSchema>
```

```tsx
// ❌ — Validate bằng logic thủ công trong component
function StepSettingsForm() {
  const handleSubmit = (data) => {
    if (!data.title) {
      setError('Tiêu đề không được để trống')  // ❌ không tái sử dụng được
      return
    }
  }
}
```

---

## 2. `resolver: zodResolver(schema)` — bắt buộc

```tsx
// ✅ — Dùng zodResolver, type-safe với schema
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stepSettingsSchema, type StepSettingsInput } from './schemas/step-settings.schema'

export function StepSettingsForm({ step }: { step: StepSchema }) {
  const form = useForm<StepSettingsInput>({
    resolver: zodResolver(stepSettingsSchema),  // bắt buộc
    defaultValues: {
      title: step.title,
      description: step.description ?? '',
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      ...
    </form>
  )
}
```

```tsx
// ❌ — Không dùng resolver → mất type safety và validation từ Zod
const form = useForm<StepSettingsInput>({
  defaultValues: { title: step.title },
  // Thiếu resolver → validate thủ công với validate prop, không đồng bộ với Zod schema
})
```

---

## 3. `watch()` vs `getValues()`

```tsx
// ✅ — getValues() khi chỉ cần value 1 lần (trong event handler)
function FieldSettingsForm() {
  const form = useForm<FieldSettingsInput>(...)

  const handleDuplicate = () => {
    const currentValues = form.getValues()  // lấy 1 lần, không subscribe
    duplicateField(currentValues)
  }

  return <button onClick={handleDuplicate}>Nhân bản</button>
}
```

```tsx
// ✅ — watch() khi cần reactive value để điều kiện hiển thị UI
function FieldSettingsForm() {
  const form = useForm<FieldSettingsInput>(...)
  const fieldType = form.watch('type')  // reactive — UI update khi type thay đổi

  return (
    <form>
      <TypeSelector name="type" control={form.control} />
      {/* Chỉ hiện khi type là select/radio/multiselect */}
      {(fieldType === 'select' || fieldType === 'radio' || fieldType === 'multiselect') && (
        <OptionsEditor name="options" control={form.control} />
      )}
    </form>
  )
}
```

```tsx
// ❌ — watch() chỉ để lấy value 1 lần trong onClick → tạo subscription không cần thiết
function FieldSettingsForm() {
  const fieldType = form.watch('type')  // tạo subscription, re-render mỗi khi type thay đổi

  const handleSave = () => {
    doSomethingWith(fieldType)  // ❌ dùng watch() chỉ để lấy value ở đây → dùng getValues()
  }
}
```

---

## 4. Controlled vs Uncontrolled

### Ưu tiên uncontrolled với `register`

```tsx
// ✅ — Uncontrolled: input tự quản lý DOM, RHF đọc khi submit
function StepSettingsForm({ step }: { step: StepSchema }) {
  const { register, handleSubmit, formState: { errors } } = useForm<StepSettingsInput>({
    resolver: zodResolver(stepSettingsSchema),
    defaultValues: { title: step.title, description: step.description },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Tiêu đề bước" />
      {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}

      <textarea {...register('description')} placeholder="Mô tả (tuỳ chọn)" />
    </form>
  )
}
```

### Dùng `Controller` khi component không support `ref`

```tsx
// ✅ — Controller cho custom component hoặc shadcn/ui Select
import { Controller } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function FieldTypeSelector({ control }: { control: Control<FieldSettingsInput> }) {
  return (
    <Controller
      name="type"
      control={control}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn loại trường" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Văn bản</SelectItem>
            <SelectItem value="number">Số</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="select">Danh sách chọn</SelectItem>
            <SelectItem value="date">Ngày tháng</SelectItem>
            <SelectItem value="rating">Đánh giá sao</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
  )
}
```

```tsx
// ❌ — Dùng Controller cho input thường (hỗ trợ ref → dùng register)
<Controller
  name="title"
  control={control}
  render={({ field }) => <input {...field} />}  // ❌ thừa, dùng register('title') là đủ
/>
```

---

## 5. Error messages — lấy từ Zod schema

```ts
// ✅ — Error message định nghĩa trong schema
// packages/validators/src/form.schema.ts
export const stepSchemaValidator = z.object({
  id: z.string(),
  title: z.string().min(1, 'Tiêu đề bước không được để trống'),  // message ở đây
  description: z.string().optional(),
  fields: z.array(fieldSchemaValidator),
})
```

```tsx
// ✅ — Component chỉ hiển thị, không hardcode message
function StepSettingsForm() {
  const { register, formState: { errors } } = useForm<StepSettingsInput>({
    resolver: zodResolver(stepSettingsSchema),
  })

  return (
    <input {...register('title')} />
    {errors.title && (
      <p className="text-red-500 text-sm">{errors.title.message}</p>  // lấy từ Zod
    )}
  )
}
```

```tsx
// ❌ — Hardcode error message trong component
{!titleValue && (
  <p className="text-red-500 text-sm">Tiêu đề không được để trống</p>  // ❌ duplicate với schema
)}
```

---

## 6. Form trong Builder vs Form engine — tách biệt hoàn toàn

### Builder forms — form để cấu hình (form owner dùng)
- Mục đích: chỉnh title của step, cài đặt validation của field, cấu hình theme...
- Submit → gọi Zustand action → auto-save debounce → API
- Không có wizard, không có step navigation

```tsx
// ✅ — Builder: FieldSettingsForm
// src/components/builder/FieldSettingsPanel.tsx
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldSchema } from '@flowform/types'
import { useBuilderStore } from '@/store/builder.store'
import { fieldSettingsSchema, type FieldSettingsInput } from './schemas/field-settings.schema'

export function FieldSettingsPanel() {
  const selectedFieldId = useBuilderStore((s) => s.selectedFieldId)
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const updateField = useBuilderStore((s) => s.updateField)
  const field = useBuilderStore((s) => {
    if (!s.form || !selectedStepId || !selectedFieldId) return null
    return s.form.steps
      .find((st) => st.id === selectedStepId)
      ?.fields.find((f) => f.id === selectedFieldId) ?? null
  })

  const form = useForm<FieldSettingsInput>({
    resolver: zodResolver(fieldSettingsSchema),
    defaultValues: field ? { label: field.label, required: field.required } : undefined,
  })

  // Sync form khi field khác được chọn
  useEffect(() => {
    if (field) form.reset({ label: field.label, required: field.required })
  }, [field?.id])

  if (!field || !selectedStepId) return <EmptyFieldHint />

  const onSubmit = (data: FieldSettingsInput) => {
    updateField(selectedStepId, field.id, data)  // → trigger auto-save debounce
  }

  return (
    <form onChange={form.handleSubmit(onSubmit)}>  {/* auto-save on change */}
      <input {...form.register('label')} />
    </form>
  )
}
```

### Form engine — wizard cho end-user điền
- Mục đích: end-user điền từng step, validate trước khi next
- Multi-step: validate từng step trước khi cho phép sang step tiếp
- Submit cuối → gọi API tạo response

```tsx
// ✅ — Form engine: WizardForm (KHÁC HOÀN TOÀN với Builder)
// src/components/form-engine/WizardForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FormSchema } from '@flowform/types'
import { buildStepSchema } from './wizard.schema'  // build dynamic schema từ StepSchema

export function WizardForm({ form }: { form: FormSchema }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = form.steps[currentStepIndex]

  // Schema khác nhau mỗi step — build từ FieldSchema
  const stepSchema = buildStepSchema(currentStep)

  const rhfForm = useForm({
    resolver: zodResolver(stepSchema),
  })

  const handleNext = rhfForm.handleSubmit(() => {
    // RHF validate step hiện tại trước khi cho phép next
    if (currentStepIndex < form.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1)
    }
  })

  return (
    <form onSubmit={handleNext}>
      {currentStep.fields.map((field) => (
        <FieldRenderer key={field.id} field={field} control={rhfForm.control} />
      ))}
      <button type="submit">
        {currentStepIndex === form.steps.length - 1 ? 'Gửi' : 'Tiếp theo'}
      </button>
    </form>
  )
}
```

**Nguyên tắc tách biệt:**
- Builder forms nằm trong `src/components/builder/`
- Form engine nằm trong `src/components/form-engine/`
- Không share component giữa 2 module này
- Schema của Builder dùng `@flowform/validators` để validate cấu hình
- Schema của Form engine được build động từ `FieldSchema` của form đó

> Form engine có rule riêng — xem `18-form-engine.md` cho conditional fields, analytics tracking và file upload.
