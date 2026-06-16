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

---

## 3. `watch()` vs `getValues()`

```tsx
// ✅ — getValues() khi chỉ cần value 1 lần (trong event handler)
const handleDuplicate = () => {
  const currentValues = form.getValues()  // lấy 1 lần, không subscribe
  duplicateField(currentValues)
}

// ✅ — watch() khi cần reactive value để điều kiện hiển thị UI
const fieldType = form.watch('type')  // reactive — UI update khi type thay đổi

// ❌ — watch() chỉ để lấy value 1 lần trong onClick
const fieldType = form.watch('type')  // tạo subscription không cần thiết
const handleSave = () => { doSomethingWith(fieldType) }  // dùng getValues() là đủ
```

---

## 4. Controlled vs Uncontrolled

### Ưu tiên uncontrolled với `register`

```tsx
// ✅ — Uncontrolled: input tự quản lý DOM, RHF đọc khi submit
const { register, handleSubmit, formState: { errors } } = useForm<StepSettingsInput>({
  resolver: zodResolver(stepSettingsSchema),
  defaultValues: { title: step.title, description: step.description },
})

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('title')} placeholder="Tiêu đề bước" />
    {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
  </form>
)
```

### Dùng `Controller` khi component không support `ref`

```tsx
// ✅ — Controller cho shadcn/ui Select
<Controller
  name="type"
  control={control}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger><SelectValue placeholder="Chọn loại trường" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="text">Văn bản</SelectItem>
        <SelectItem value="email">Email</SelectItem>
        <SelectItem value="select">Danh sách chọn</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

---

## 5. Error messages — lấy từ Zod schema

```tsx
// ✅ — Component chỉ hiển thị, không hardcode message
{errors.title && (
  <p className="text-red-500 text-sm">{errors.title.message}</p>  // lấy từ Zod
)}

// ❌ — Hardcode error message trong component
{!titleValue && (
  <p className="text-red-500 text-sm">Tiêu đề không được để trống</p>  // ❌ duplicate với schema
)}
```

---

## 6. Form trong Builder vs Form engine — tách biệt hoàn toàn

**Builder forms** (form owner cấu hình) nằm trong `src/components/builder/`
- Submit → Zustand action → auto-save debounce → API
- Không có wizard, không có step navigation

**Form engine** (end-user điền) nằm trong `src/components/form-engine/`
- Multi-step: validate từng step trước khi cho phép sang step tiếp
- Submit cuối → gọi API tạo response

> **Lưu ý về Container/Presenter (rule 08):**
> - Auth forms (login, register) có `signIn.email()`, `signUp.email()`, `router.push()` → **phải tách Container** — xem `08-presenter-container.md` section 6
> - Builder settings forms (đọc Zustand store trực tiếp) → là Organism của Builder, không cần tách Container riêng
