# 02 — Quy tắc viết React Components

## 1. Server Component vs Client Component

### Mặc định: Server Component (không có directive)
Dùng Server Component khi component:
- Chỉ render UI, không có event handler
- Fetch data trực tiếp (async)
- Không dùng browser API (localStorage, window...)
- Không dùng hooks (useState, useEffect, useBuilderStore...)

### Thêm `'use client'` khi component:
- Có event handler (`onClick`, `onChange`...)
- Dùng hooks (`useState`, `useEffect`, `useBuilderStore`...)
- Dùng browser API
- Dùng TanStack Query hooks (`useQuery`, `useMutation`)

```tsx
// ✅ — Server Component: fetch data, render tĩnh
// src/components/builder/FormHeader.tsx
import type { FormSchema } from '@flowform/types'

interface FormHeaderProps {
  form: FormSchema
}

export function FormHeader({ form }: FormHeaderProps) {
  return (
    <header>
      <h1>{form.title}</h1>
      {form.description && <p>{form.description}</p>}
    </header>
  )
}
```

```tsx
// ✅ — Client Component: có interaction
// src/components/builder/StepCard.tsx
'use client'

import type { StepSchema } from '@flowform/types'
import { useBuilderStore } from '@/store/builder.store'

interface StepCardProps {
  step: StepSchema
}

export function StepCard({ step }: StepCardProps) {
  const selectStep = useBuilderStore((s) => s.selectStep)
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)

  return (
    <div
      onClick={() => selectStep(step.id)}
      data-selected={selectedStepId === step.id}
    >
      {step.title}
    </div>
  )
}
```

```tsx
// ❌ — Không cần 'use client' nhưng vẫn thêm vào
'use client'  // thừa — không có hooks hay event handler

export function FormTitle({ title }: { title: string }) {
  return <h1>{title}</h1>
}
```

---

## 2. Composition pattern — ưu tiên hơn props drilling

### Tránh truyền props qua nhiều tầng

```tsx
// ❌ — Props drilling 3 tầng
function BuilderPage() {
  const form = useBuilderStore((s) => s.form)
  return <LeftPanel form={form} selectedStepId={selectedStepId} onSelectStep={selectStep} />
}

function LeftPanel({ form, selectedStepId, onSelectStep }) {
  return <StepList form={form} selectedStepId={selectedStepId} onSelectStep={onSelectStep} />
}

function StepList({ form, selectedStepId, onSelectStep }) {
  return form.steps.map((step) => (
    <StepCard key={step.id} step={step} selectedStepId={selectedStepId} onSelectStep={onSelectStep} />
  ))
}
```

```tsx
// ✅ — Mỗi component tự đọc từ store
// BuilderPage không cần biết StepCard cần gì
function BuilderPage() {
  return (
    <div className="h-screen flex">
      <LeftPanel />
      <Canvas />
      <RightPanel />
    </div>
  )
}

// StepCard tự đọc selection state từ store
function StepCard({ step }: { step: StepSchema }) {
  const selectStep = useBuilderStore((s) => s.selectStep)
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)
  return <div onClick={() => selectStep(step.id)} data-selected={isSelected}>{step.title}</div>
}
```

### Children composition pattern

```tsx
// ✅ — Composition với children
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <aside className={cn('border-r bg-white p-4', className)}>{children}</aside>
}

// Dùng:
<Panel className="w-64">
  <StepList />
</Panel>
```

---

## 3. shadcn/ui — cách dùng đúng

### KHÔNG modify file trong `components/ui/`
Các file trong `src/components/ui/` do shadcn/ui generate. Chỉnh sửa trực tiếp sẽ bị ghi đè khi chạy `npx shadcn@latest add`.

```tsx
// ❌ — Đừng sửa trực tiếp components/ui/button.tsx
// src/components/ui/button.tsx
export const Button = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <button
      className={cn('my-custom-default', buttonVariants({ variant }), className)}  // ❌ sửa file gốc
    />
  )
})
```

```tsx
// ✅ — Tạo wrapper component riêng
// src/components/shared/PrimaryButton.tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrimaryButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
}

export function PrimaryButton({ loading, children, className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn('min-w-24', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Đang lưu...' : children}
    </Button>
  )
}
```

### Thêm component shadcn mới
```bash
# Luôn chạy từ thư mục apps/web
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

---

## 4. Props typing

### Dùng `interface`, không dùng `type` cho props

```tsx
// ✅
interface StepCardProps {
  step: StepSchema
  className?: string
}

export function StepCard({ step, className }: StepCardProps) { ... }
```

```tsx
// ❌ — Dùng type cho props
type StepCardProps = {
  step: StepSchema
  className?: string
}
```

### Không dùng `FC<>` (Function Component generic)

```tsx
// ❌ — Không dùng FC<>
import type { FC } from 'react'

const StepCard: FC<StepCardProps> = ({ step }) => { ... }
```

```tsx
// ✅ — Khai báo function bình thường
function StepCard({ step }: StepCardProps) { ... }

// ✅ — Hoặc arrow function (nhất quán trong cùng codebase)
const StepCard = ({ step }: StepCardProps) => { ... }
```

### Extend props từ HTML element

```tsx
// ✅ — Extend ComponentProps khi cần truyền HTML attributes
interface FieldInputProps extends React.ComponentProps<'input'> {
  label: string
  error?: string
}

export function FieldInput({ label, error, className, ...inputProps }: FieldInputProps) {
  return (
    <div>
      <label>{label}</label>
      <input className={cn('border rounded', className)} {...inputProps} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

---

## 5. Children — dùng `React.ReactNode`

```tsx
// ✅
interface PanelProps {
  children: React.ReactNode
  title?: string
}
```

```tsx
// ❌ — JSX.Element quá hẹp, không nhận string, null, array
interface PanelProps {
  children: JSX.Element
}
```

---

## 6. Named export — không dùng default export trong `components/`

```tsx
// ✅ — Named export
export function StepCard({ step }: StepCardProps) { ... }

// Import:
import { StepCard } from '@/components/builder/StepCard'
```

```tsx
// ❌ — Default export trong components/
export default function StepCard({ step }: StepCardProps) { ... }

// Vấn đề: người import có thể đặt tên tùy ý → khó tìm kiếm
import MyCard from '@/components/builder/StepCard'  // tên không nhất quán
```

**Ngoại lệ:** `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx` bắt buộc phải là default export theo Next.js App Router.

```tsx
// ✅ — page.tsx luôn default export (Next.js yêu cầu)
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  return <BuilderShell formId={id} />
}
```

---

## 7. Giới hạn: 1 component chính per file

```tsx
// ✅ — StepList.tsx: 1 component chính + 1 helper nhỏ
'use client'

// Helper nhỏ < 30 dòng, chỉ dùng ở đây
function EmptyStepHint() {
  return <p className="text-sm text-gray-400">Chưa có bước nào. Nhấn + để thêm.</p>
}

// Component chính
export function StepList() {
  const steps = useBuilderStore((s) => s.form?.steps ?? [])
  if (steps.length === 0) return <EmptyStepHint />
  return (
    <ul>
      {steps.map((step) => (
        <StepCard key={step.id} step={step} />  // StepCard đặt ở file riêng
      ))}
    </ul>
  )
}
```

```tsx
// ❌ — Quá nhiều component lớn trong 1 file
export function StepList() { ... }      // 80 dòng
export function StepCard() { ... }      // 60 dòng
export function StepActions() { ... }   // 70 dòng
// Tổng 210 dòng → quá khó đọc, tách ra 3 file
```
