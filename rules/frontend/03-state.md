# 03 — Quy tắc quản lý state với Zustand

## 1. Global state (Zustand) vs Local state (useState)

### Dùng Zustand khi
- State cần share giữa nhiều component không liên quan nhau trong cây component
- State của Builder (form schema, selection) — persist qua navigation
- State cần trigger action phức tạp (reorder, add/remove nested)

### Dùng useState khi
- State chỉ dùng trong 1 component (UI state cục bộ)
- Toggle open/close của dropdown, dialog
- Input uncontrolled nhỏ chưa cần save

```tsx
// ✅ — useState cho UI state cục bộ
export function StepCard({ step }: { step: StepSchema }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)  // chỉ card này cần biết

  return (
    <div>
      {step.title}
      <button onClick={() => setIsMenuOpen(true)}>...</button>
      {isMenuOpen && <StepContextMenu onClose={() => setIsMenuOpen(false)} />}
    </div>
  )
}
```

```tsx
// ✅ — Zustand cho Builder selection (nhiều panel cùng quan tâm)
// LeftPanel, Canvas, RightPanel đều cần biết step nào đang được chọn
export function StepCard({ step }: { step: StepSchema }) {
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
// ❌ — Dùng useState cho selection → phải lift state lên, gây props drilling
function BuilderPage() {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  // Phải truyền selectedStepId và setSelectedStepId xuống tất cả children
}
```

---

## 2. Cấu trúc Builder store

Store hiện tại (`src/store/builder.store.ts`) gồm 2 phần:

```ts
// State shape
interface BuilderState {
  form: FormSchema | null          // full form schema
  selectedStepId: string | null    // ID bước đang được chọn
  selectedFieldId: string | null   // ID field đang được chọn
}

// Actions
interface BuilderActions {
  setForm(form: FormSchema): void
  selectStep(stepId: string | null): void
  selectField(fieldId: string | null): void
  addStep(): void
  removeStep(stepId: string): void
  updateStep(stepId: string, updates: Partial<Pick<StepSchema, 'title' | 'description'>>): void
  reorderSteps(fromIndex: number, toIndex: number): void
  addField(stepId: string, type: FieldSchema['type']): void
  removeField(stepId: string, fieldId: string): void
  updateField(stepId: string, fieldId: string, updates: Partial<FieldSchema>): void
  reorderFields(stepId: string, fromIndex: number, toIndex: number): void
}
```

### Thêm action mới — làm theo pattern sau

```ts
// ✅ — Thêm action duplicateStep vào store
interface BuilderActions {
  // ... actions hiện tại ...
  duplicateStep: (stepId: string) => void  // thêm vào interface trước
}

// Trong create():
duplicateStep: (stepId) =>
  set((s) => {
    if (!s.form) return
    const step = s.form.steps.find((st) => st.id === stepId)
    if (!step) return
    // Immer cho phép mutate trực tiếp
    s.form.steps.push({
      ...step,
      id: crypto.randomUUID(),         // new ID
      title: `${step.title} (copy)`,
      fields: step.fields.map((f) => ({ ...f, id: crypto.randomUUID() })),
    })
  }),
```

---

## 3. Không gọi store hooks trong Server Components

```tsx
// ❌ — Server Component (không có 'use client') gọi useBuilderStore → lỗi runtime
// src/app/(builder)/forms/[id]/builder/page.tsx
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = useBuilderStore((s) => s.form)  // ❌ hooks không chạy trong Server Component
  return <div>{form?.title}</div>
}
```

```tsx
// ✅ — Server Component fetch data, truyền xuống Client Component
// page.tsx (Server Component)
export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  const form = await fetchForm(id)  // fetch thuần ở server
  return <BuilderShell initialForm={form} />  // truyền xuống client component
}

// BuilderShell.tsx (Client Component)
'use client'

export function BuilderShell({ initialForm }: { initialForm: FormSchema }) {
  const setForm = useBuilderStore((s) => s.setForm)

  useEffect(() => {
    setForm(initialForm)  // ✅ đẩy vào store ở client
  }, [initialForm, setForm])

  return <div className="h-screen flex">...</div>
}
```

---

## 4. Selector pattern — tránh re-render không cần thiết

```tsx
// ❌ — Lấy toàn bộ store → re-render mỗi khi bất kỳ state nào thay đổi
function StepCard({ step }: { step: StepSchema }) {
  const store = useBuilderStore()  // re-render kể cả khi chỉ selectedFieldId thay đổi
  const isSelected = store.selectedStepId === step.id
}
```

```tsx
// ✅ — Selector cụ thể → chỉ re-render khi selectedStepId thay đổi
function StepCard({ step }: { step: StepSchema }) {
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)
  const selectStep = useBuilderStore((s) => s.selectStep)
  // Re-render CHỈ khi selectedStepId thay đổi, không re-render khi selectedFieldId đổi
}
```

```tsx
// ✅ — Lấy derived value trong selector
function FieldCount({ stepId }: { stepId: string }) {
  const count = useBuilderStore(
    (s) => s.form?.steps.find((st) => st.id === stepId)?.fields.length ?? 0
  )
  return <span>{count} trường</span>
}
```

---

## 5. Immer — cách mutate nested object đúng cách

Với Immer middleware, bên trong `set((s) => { ... })` có thể mutate trực tiếp.

```ts
// ✅ — Mutate nested object với Immer
updateField: (stepId, fieldId, updates) =>
  set((s) => {
    if (!s.form) return
    const step = s.form.steps.find((st) => st.id === stepId)
    const field = step?.fields.find((f) => f.id === fieldId)
    if (field) Object.assign(field, updates)  // mutate trực tiếp — OK với Immer
  }),
```

```ts
// ❌ — Không cần spread khi dùng Immer (nhưng vẫn hoạt động — chỉ là không cần thiết)
updateField: (stepId, fieldId, updates) =>
  set((s) => {
    if (!s.form) return
    s.form = {
      ...s.form,  // không cần — Immer handle immutability tự động
      steps: s.form.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              fields: step.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : step
      ),
    }
  }),
```

```ts
// ❌ — Mutate state NGOÀI set() → không hoạt động với Zustand
const store = useBuilderStore.getState()
store.form.steps[0].title = 'New title'  // không trigger re-render
```

---

## 6. Không tạo store mới nếu đã có store phù hợp

```ts
// ❌ — Tạo store riêng cho selection khi builder.store đã có selectedStepId
// src/store/selection.store.ts  ← ĐỪNG TẠO
export const useSelectionStore = create(() => ({
  selectedStepId: null,
  selectedFieldId: null,
}))
```

```ts
// ✅ — Thêm state/action vào builder.store hiện tại
// Nếu cần thêm UI state cho builder (vd: panel collapse), thêm vào BuilderState
interface BuilderState {
  form: FormSchema | null
  selectedStepId: string | null
  selectedFieldId: string | null
  isRightPanelCollapsed: boolean   // ✅ thêm vào đây
}
```

**Khi nào được tạo store mới:** khi state hoàn toàn độc lập với builder (vd: `useThemeStore` cho theme editor riêng biệt, hoặc `useAnalyticsStore` cho analytics dashboard).
