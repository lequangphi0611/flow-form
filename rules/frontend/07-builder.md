# 07 — Quy tắc đặc thù cho module Builder

## 1. Luồng data trong Builder

```
API response
    ↓
page.tsx (Server Component) — fetch form
    ↓
BuilderShell (Client Component) — useEffect → setForm()
    ↓
useBuilderStore — single source of truth
    ↑↓
Components đọc store qua selector
    ↓
User action (click, drag, type)
    ↓
Store action (updateField, reorderSteps...)
    ↓
useEffect watch store → debounce 1s
    ↓
API PUT /forms/:id — auto-save
```

```tsx
// ✅ — Toàn bộ luồng data
// 1. page.tsx: fetch và truyền xuống
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await fetchForm(id)      // fetch ở server
  return <BuilderShell initialForm={form} />
}

// 2. BuilderShell: khởi tạo store, setup auto-save
'use client'

export function BuilderShell({ initialForm }: { initialForm: FormSchema }) {
  const setForm = useBuilderStore((s) => s.setForm)

  useEffect(() => {
    setForm(initialForm)               // đẩy vào store 1 lần khi mount
  }, [])                               // intentionally empty deps — only on mount

  return (
    <div className="h-screen flex">
      <StepListPanel />                // đọc từ store
      <Canvas />                       // đọc từ store
      <FieldSettingsPanel />           // đọc từ store
    </div>
  )
}

// 3. Component đọc từ store với selector
export function StepListPanel() {
  const steps = useBuilderStore((s) => s.form?.steps ?? [])
  return <ul>{steps.map((step) => <StepCard key={step.id} step={step} />)}</ul>
}
```

---

## 2. dnd-kit — Setup chuẩn cho Builder

Builder có 2 vùng drag & drop độc lập:
- **Step list** (left panel): reorder steps
- **Field list** (canvas center): reorder fields trong 1 step

### Setup DndContext

```tsx
// ✅ — src/components/builder/BuilderDndProvider.tsx
'use client'

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useBuilderStore } from '@/store/builder.store'

export function BuilderDndProvider({ children }: { children: React.ReactNode }) {
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)
  const reorderFields = useBuilderStore((s) => s.reorderFields)
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },  // cần di chuyển 8px mới bắt đầu drag
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dragType = active.data.current?.type  // 'STEP' | 'FIELD'
    const fromIndex = active.data.current?.index as number
    const toIndex = over.data.current?.index as number

    if (dragType === 'STEP') {
      reorderSteps(fromIndex, toIndex)
    }

    if (dragType === 'FIELD' && selectedStepId) {
      reorderFields(selectedStepId, fromIndex, toIndex)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}
```

### Setup SortableContext cho Step list

```tsx
// ✅ — src/components/builder/StepListPanel.tsx
'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBuilderStore } from '@/store/builder.store'
import { SortableStepCard } from './SortableStepCard'

export function StepListPanel() {
  const steps = useBuilderStore((s) => s.form?.steps ?? [])
  const stepIds = steps.map((s) => s.id)  // SortableContext cần array of IDs

  return (
    <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col gap-1">
        {steps.map((step, index) => (
          <SortableStepCard key={step.id} step={step} index={index} />
        ))}
      </ul>
    </SortableContext>
  )
}
```

---

## 3. Drag types — phân biệt STEP vs FIELD

Dùng `data` attribute trong `useSortable` để phân biệt loại drag item.

```tsx
// ✅ — SortableStepCard: STEP drag
// src/components/builder/SortableStepCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { StepSchema } from '@flowform/types'
import { useBuilderStore } from '@/store/builder.store'

interface SortableStepCardProps {
  step: StepSchema
  index: number
}

export function SortableStepCard({ step, index }: SortableStepCardProps) {
  const selectStep = useBuilderStore((s) => s.selectStep)
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    data: {
      type: 'STEP',   // ← type để phân biệt trong handleDragEnd
      index,
      step,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => selectStep(step.id)}
        className={cn(
          'flex items-center gap-2 p-3 rounded-md border cursor-pointer',
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        )}
      >
        <span {...listeners} className="cursor-grab text-gray-400">
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm truncate">{step.title}</span>
        <span className="text-xs text-gray-400">{step.fields.length} trường</span>
      </div>
    </li>
  )
}
```

```tsx
// ✅ — SortableFieldCard: FIELD drag (khác với STEP)
export function SortableFieldCard({ field, index }: { field: FieldSchema; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
    data: {
      type: 'FIELD',  // ← khác với 'STEP'
      index,
      field,
    },
  })
  // ...
}
```

---

## 4. Không mutate store trực tiếp trong component

```tsx
// ❌ — Mutate store trực tiếp trong component
export function StepCard({ step }: { step: StepSchema }) {
  const store = useBuilderStore()

  const handleDelete = () => {
    // Đừng làm thế này
    store.form!.steps = store.form!.steps.filter((s) => s.id !== step.id)
  }
}
```

```tsx
// ✅ — Luôn gọi qua action của store
export function StepCard({ step }: { step: StepSchema }) {
  const removeStep = useBuilderStore((s) => s.removeStep)

  const handleDelete = () => {
    removeStep(step.id)  // action xử lý mutation với Immer
  }

  return (
    <div>
      {step.title}
      <button onClick={handleDelete}>Xóa</button>
    </div>
  )
}
```

---

## 5. Canvas — chỉ render, không chứa logic

Canvas (center panel) là nơi hiển thị preview form đang được build. Component này:
- Chỉ đọc từ store để render
- Không chứa business logic
- Không tự tính toán derived state phức tạp
- Delegate tất cả action về store

```tsx
// ✅ — Canvas chỉ render
// src/components/builder/Canvas.tsx
'use client'

import { useBuilderStore } from '@/store/builder.store'
import { FieldList } from './FieldList'

export function Canvas() {
  const selectedStep = useBuilderStore((s) => {
    if (!s.form || !s.selectedStepId) return null
    return s.form.steps.find((st) => st.id === s.selectedStepId) ?? null
  })

  if (!selectedStep) {
    return (
      <main className="flex-1 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chọn một bước để xem</p>
      </main>
    )
  }

  return (
    <main className="flex-1 bg-gray-100 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">{selectedStep.title}</h2>
        {selectedStep.description && (
          <p className="text-gray-500 mb-6">{selectedStep.description}</p>
        )}
        <FieldList stepId={selectedStep.id} fields={selectedStep.fields} />
      </div>
    </main>
  )
}
```

```tsx
// ❌ — Canvas chứa business logic
export function Canvas() {
  const store = useBuilderStore()

  // ❌ Logic không thuộc về Canvas — đưa vào store action hoặc hook
  const handleReorder = (from: number, to: number) => {
    if (!store.selectedStepId) return
    const step = store.form?.steps.find((s) => s.id === store.selectedStepId)
    if (!step) return
    const newFields = [...step.fields]
    const [moved] = newFields.splice(from, 1)
    newFields.splice(to, 0, moved)
    // ... mutate store trực tiếp
  }
}
```

---

## 6. Auto-save — debounce 1 giây

```tsx
// ✅ — src/hooks/useAutoSave.ts
'use client'

import { useEffect, useRef } from 'react'
import { useBuilderStore } from '@/store/builder.store'
import { formsApi } from '@/lib/api/forms'
import type { FormSchema } from '@flowform/types'

const AUTOSAVE_DELAY = 1000  // 1 second

export function useAutoSave(formId: string) {
  const form = useBuilderStore((s) => s.form)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Bỏ qua lần đầu render (khi setForm() được gọi để khởi tạo)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!form) return

    // Clear debounce timer trước đó
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Set timer mới
    timeoutRef.current = setTimeout(async () => {
      try {
        await formsApi.update(formId, form)  // gọi qua lib/api — xem 11-data-layer.md
      } catch {
        // toast.error nếu muốn thông báo — xem 13-error-handling.md
      }
    }, AUTOSAVE_DELAY)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [form, formId])  // trigger khi form state thay đổi
}

```

```tsx
// Dùng trong BuilderShell
'use client'

export function BuilderShell({ initialForm }: { initialForm: FormSchema }) {
  const setForm = useBuilderStore((s) => s.setForm)
  useAutoSave(initialForm.id)  // ✅ setup ở đây, không cần truyền xuống

  useEffect(() => {
    setForm(initialForm)
  }, [])

  return <div className="h-screen flex">...</div>
}
```

```tsx
// ❌ — Debounce bằng cách tự setTimeout trong component — khó cleanup
export function FieldSettingsPanel() {
  const updateField = useBuilderStore((s) => s.updateField)

  const handleChange = (fieldId: string, updates: Partial<FieldSchema>) => {
    updateField(selectedStepId, fieldId, updates)
    // ❌ setTimeout rải rác trong nhiều component → khó debug, có thể leak
    setTimeout(() => saveToAPI(), 1000)
  }
}
```

---

## 7. Selection — chỉ dùng store actions

```tsx
// ✅ — Click step → gọi selectStep() từ store
export function SortableStepCard({ step }: { step: StepSchema }) {
  const selectStep = useBuilderStore((s) => s.selectStep)
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)

  return (
    <div onClick={() => selectStep(step.id)} data-selected={isSelected}>
      {step.title}
    </div>
  )
}
```

```tsx
// ✅ — Click field → gọi selectField() từ store
export function SortableFieldCard({ field }: { field: FieldSchema }) {
  const selectField = useBuilderStore((s) => s.selectField)
  const isSelected = useBuilderStore((s) => s.selectedFieldId === field.id)

  return (
    <div onClick={() => selectField(field.id)} data-selected={isSelected}>
      {field.label}
    </div>
  )
}
```

```tsx
// ❌ — Dùng local state hoặc callback prop cho selection
// Parent phải giữ selectedStepId → props drilling
function StepListPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)  // ❌ local state
  return (
    <ul>
      {steps.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          isSelected={selectedId === step.id}
          onSelect={setSelectedId}  // ❌ phải truyền callback
        />
      ))}
    </ul>
  )
}
```

### selectStep() tự clear selectedFieldId

Hành vi hiện tại của store: khi gọi `selectStep()`, `selectedFieldId` tự reset về `null`. Đây là intentional — FieldSettingsPanel sẽ ẩn khi chuyển step.

```ts
// builder.store.ts — behavior hiện tại
selectStep: (stepId) =>
  set((s) => {
    s.selectedStepId = stepId
    s.selectedFieldId = null  // ← auto clear field selection
  }),
```

Không override behavior này trong component. Nếu muốn thay đổi, sửa trong store action.
