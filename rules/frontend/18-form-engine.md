# 18 — Form Engine (Wizard Renderer)

> Rule này dành riêng cho module Form Engine — wizard end-user điền form public.
> Khác hoàn toàn với Builder (owner cấu hình form). Xem `07-builder.md` cho Builder.

---

## 1. Conditional field rendering

`FieldSchema.conditions` định nghĩa logic "nếu field A = X thì hiện/ẩn field này".

```tsx
// ✅ — Dùng watch() để reactive evaluate conditions
// src/components/form-engine/WizardStep.tsx
'use client'

import { useWatch } from 'react-hook-form'
import type { StepSchema, FieldSchema } from '@flowform/types'

interface WizardStepProps {
  step: StepSchema
  control: Control
}

export function WizardStep({ step, control }: WizardStepProps) {
  // watch toàn bộ form values — reactive khi user điền
  const formValues = useWatch({ control })

  // Evaluate condition: field có visible không?
  const isFieldVisible = (field: FieldSchema): boolean => {
    if (!field.conditions || field.conditions.length === 0) return true

    return field.conditions.every((condition) => {
      const currentValue = formValues[condition.fieldId]
      switch (condition.operator) {
        case 'equals':    return currentValue === condition.value
        case 'not_equals': return currentValue !== condition.value
        case 'contains':  return String(currentValue).includes(String(condition.value))
        default:          return true
      }
    })
  }

  const visibleFields = step.fields.filter(isFieldVisible)

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => (
        <FieldRenderer key={field.id} field={field} control={control} />
      ))}
    </div>
  )
}
```

**Quy tắc:**
- Evaluate conditions ở **render time** — không pre-compute, `useWatch` đã reactive
- Hidden fields **không được validate** — chỉ build Zod schema từ `visibleFields`
- Khi field bị ẩn, giá trị của nó vẫn giữ trong RHF — không reset trừ khi step config yêu cầu

---

## 2. Dynamic Zod schema từ visible fields

Schema phải rebuild mỗi khi `visibleFields` thay đổi — chỉ validate fields đang hiển thị.

```ts
// ✅ — src/components/form-engine/wizard.schema.ts
import { z } from 'zod'
import type { FieldSchema } from '@flowform/types'

export function buildStepSchema(visibleFields: FieldSchema[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}

  for (const field of visibleFields) {
    let fieldSchema: z.ZodTypeAny = z.string()

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Email không hợp lệ')
        break
      case 'number':
        fieldSchema = z.coerce.number()
        break
      case 'date':
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
        break
      case 'multiselect':
      case 'checkbox':
        fieldSchema = z.array(z.string())
        break
      default:
        fieldSchema = z.string()
    }

    // Validation từ field config
    if (field.validation?.minLength) {
      fieldSchema = (fieldSchema as z.ZodString).min(field.validation.minLength)
    }

    // Required/optional
    shape[field.id] = field.required
      ? fieldSchema
      : fieldSchema.optional()
  }

  return z.object(shape)
}
```

```tsx
// ✅ — Dùng trong WizardForm với useMemo
// src/components/form-engine/WizardForm.tsx
'use client'

import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildStepSchema } from './wizard.schema'

export function WizardForm({ form }: { form: FormSchema }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = form.steps[currentStepIndex]

  const rhfForm = useForm()
  const formValues = useWatch({ control: rhfForm.control })

  // Compute visible fields reactive
  const visibleFields = useMemo(
    () => currentStep.fields.filter((f) => isFieldVisible(f, formValues)),
    [currentStep.fields, formValues]
  )

  // Rebuild schema chỉ khi visible fields thay đổi
  const stepSchema = useMemo(
    () => buildStepSchema(visibleFields),
    [visibleFields]
  )

  // Sync resolver khi schema thay đổi
  useEffect(() => {
    rhfForm.reset(rhfForm.getValues(), { resolver: zodResolver(stepSchema) })
  }, [stepSchema])

  const handleNext = rhfForm.handleSubmit(() => {
    if (currentStepIndex < form.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1)
    } else {
      handleSubmitFinal()
    }
  })

  // ...
}
```

---

## 3. Analytics event tracking

Fire-and-forget — không block UX, không hiện lỗi nếu tracking fail.

```ts
// ✅ — src/hooks/useFormTracking.ts
'use client'

import { useEffect, useRef } from 'react'

const TRACKING_API = `${process.env.NEXT_PUBLIC_API_URL}/api/forms`

export function useFormTracking(formId: string) {
  const sessionId = useRef(crypto.randomUUID())  // session ID cho lần fill này
  const hasStarted = useRef(false)

  function track(eventType: 'view' | 'start' | 'step_complete' | 'complete', stepIndex?: number) {
    // fire-and-forget — không await, không catch lỗi vào UI
    fetch(`${TRACKING_API}/${formId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId.current,
        eventType,
        stepIndex: stepIndex ?? 0,
      }),
    }).catch(() => {})  // intentionally swallow — tracking không critical
  }

  // Track 'view' khi component mount
  useEffect(() => {
    track('view')

    // Track 'abandon' khi user đóng tab — dùng sendBeacon (guaranteed delivery)
    const handleUnload = () => {
      if (hasStarted.current) {
        navigator.sendBeacon(
          `${TRACKING_API}/${formId}/events`,
          JSON.stringify({
            sessionId: sessionId.current,
            eventType: 'abandon',
            stepIndex: 0,
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [formId])

  return {
    sessionId: sessionId.current,
    trackStart: () => {
      if (!hasStarted.current) {
        hasStarted.current = true
        track('start')
      }
    },
    trackStepComplete: (stepIndex: number) => track('step_complete', stepIndex),
    trackComplete: () => track('complete'),
  }
}
```

```tsx
// ✅ — Dùng trong WizardForm
export function WizardForm({ form }: { form: FormSchema }) {
  const { sessionId, trackStart, trackStepComplete, trackComplete } = useFormTracking(form.id)

  const handleNext = rhfForm.handleSubmit(() => {
    trackStepComplete(currentStepIndex)
    setCurrentStepIndex((i) => i + 1)
  })

  const handleFirstInteraction = () => trackStart()  // gắn vào onFocus của field đầu tiên

  // ...
}
```

**Quy tắc:**
- Tracking **không được** block submit hay navigation
- `sendBeacon()` cho `abandon` — browser đảm bảo gửi được dù tab đóng
- Nếu tracking API down → user không biết, không hiện lỗi

---

## 4. File upload trong Form Engine

End-user upload file → POST `multipart/form-data` **trực tiếp đến NestJS** (`/api/storage/upload`). NestJS proxy file lên Firebase Storage và trả về `publicUrl`. Không cần Next.js Route Handler trung gian.

```tsx
// ✅ — FileUploadField trong Form Engine
// src/components/form-engine/fields/FileUploadField.tsx
'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

interface FileUploadFieldProps {
  formId: string
  fieldId: string
  onChange: (url: string) => void
}

export function FileUploadField({ formId, fieldId, onChange }: FileUploadFieldProps) {
  const { mutate: uploadFile, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('formId', formId)
      // KHÔNG set Content-Type — browser tự set multipart boundary

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/storage/upload`, {
        method: 'POST',
        credentials: 'include', // gửi session cookie để NestJS xác thực
        body: formData,
      })

      if (!res.ok) throw new Error('Upload thất bại')
      const { publicUrl } = await res.json()
      return publicUrl as string
    },

    onSuccess: (url) => onChange(url),
    onError: () => toast.error('Upload thất bại, thử lại'),
  })

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        disabled={isPending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile(file)
        }}
        className="text-sm"
      />
      {isPending && <p className="text-xs text-gray-500">Đang upload...</p>}
    </div>
  )
}
```

**Quy tắc:**
- KHÔNG set `Content-Type: multipart/form-data` thủ công — browser tự set với multipart boundary đúng
- `credentials: 'include'` bắt buộc — NestJS dùng session cookie để auth
- Upload trả về `{ publicUrl, fileKey }` — lưu `publicUrl` vào form response data
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`; khai báo trong `accept` attribute để guide người dùng
- Max size 10MB được enforce bởi Multer ở NestJS — frontend không cần kiểm tra riêng

---

## 5. Submit final response

```tsx
// ✅ — Submit toàn bộ response sau step cuối
async function handleSubmitFinal(allValues: Record<string, unknown>) {
  trackComplete()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/forms/${form.id}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        data: allValues,
      }),
    }
  )

  if (!res.ok) {
    toast.error('Gửi form thất bại, thử lại sau')
    return
  }

  // Redirect đến success message hoặc URL tùy FormSettings
  if (form.settings.redirectUrl) {
    window.location.href = form.settings.redirectUrl
  } else {
    setIsSubmitted(true)  // hiển thị success message trong trang
  }
}
```
