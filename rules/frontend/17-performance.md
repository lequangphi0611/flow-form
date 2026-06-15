# 17 — Performance: Memo & Code Splitting

> Nguyên tắc: **Profile first** — không memo trước khi đo. Ngoại lệ rõ ràng cho list items trong Builder.

---

## 1. `React.memo` — chỉ cho list items

Builder re-render thường xuyên (store thay đổi khi user typing, drag). List items là nơi duy nhất memo có giá trị ngay cả khi chưa profile.

```tsx
// ✅ — Memo cho items render trong list
// src/components/builder/StepCard.tsx
import { memo } from 'react'

export const StepCard = memo(function StepCard({ step }: { step: StepSchema }) {
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)
  const selectStep = useBuilderStore((s) => s.selectStep)

  return (
    <div onClick={() => selectStep(step.id)} data-selected={isSelected}>
      {step.title}
    </div>
  )
})
// Memo hóa: StepCard chỉ re-render khi step prop thay đổi hoặc isSelected thay đổi
// Không re-render khi selectedFieldId thay đổi (nhờ selector cụ thể)
```

**Áp dụng `React.memo` cho:**
- `StepCard` / `SortableStepCard` — render trong list steps
- `FieldCard` / `SortableFieldCard` — render trong list fields
- `ResponseTableRow` — render trong bảng responses

**Không áp dụng `React.memo` cho:**
- Panels, containers, layouts (render 1 lần)
- Pages, skeletons, empty states
- Components không nhận props phức tạp

---

## 2. `useCallback` — chỉ khi pass xuống memo'd component

`useCallback` chỉ có ý nghĩa khi callback được truyền xuống component đã `React.memo`. Nếu không, callback mới mỗi render cũng không sao.

```tsx
// ✅ — useCallback khi callback truyền xuống memo'd component
export function StepListPanel() {
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)

  // useCallback vì handleDragEnd truyền xuống BuilderDndProvider (có memo)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = active.data.current?.index as number
    const toIndex = over.data.current?.index as number
    reorderSteps(fromIndex, toIndex)
  }, [reorderSteps])

  return <BuilderDndProvider onDragEnd={handleDragEnd}>...</BuilderDndProvider>
}
```

```tsx
// ❌ — useCallback cho callback không truyền xuống memo'd component
export function FormCard({ form, onDelete }: FormCardProps) {
  // handleClick không truyền xuống component nào — useCallback ở đây vô nghĩa
  const handleClick = useCallback(() => {
    onDelete(form.id)
  }, [form.id, onDelete])

  return <button onClick={handleClick}>Xóa</button>
  // ✅ Đúng: <button onClick={() => onDelete(form.id)}>Xóa</button>
}
```

---

## 3. `useMemo` — cho computed values đắt tiền

```tsx
// ✅ — useMemo cho dynamic Zod schema (build từ FieldSchema[] — tính toán không nhỏ)
// src/components/form-engine/WizardForm.tsx
export function WizardForm({ form }: { form: FormSchema }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(new Set())

  const currentStep = form.steps[currentStepIndex]

  // useMemo: chỉ rebuild schema khi step hoặc visible fields thay đổi
  const stepSchema = useMemo(
    () => buildStepSchema(currentStep, visibleFieldIds),
    [currentStep, visibleFieldIds]
  )

  const rhfForm = useForm({ resolver: zodResolver(stepSchema) })
  // ...
}
```

```tsx
// ✅ — useMemo cho sorted/filtered list đắt tiền
const sortedForms = useMemo(
  () => [...forms].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  [forms]
)
```

```tsx
// ❌ — useMemo cho computation rẻ — overhead của memo lớn hơn lợi ích
const title = useMemo(() => form.title.toUpperCase(), [form.title])
// ✅ Đúng: const title = form.title.toUpperCase()
```

**Dùng `useMemo` khi:**
- Build Zod schema từ field list (Form Engine)
- Sort/filter array lớn (>100 items)
- Tạo object phức tạp truyền xuống memo'd component

---

## 4. `next/dynamic` — Code splitting cho thư viện nặng

Thư viện nặng không cần load ở mọi trang → lazy load với `next/dynamic`.

```tsx
// ✅ — Lazy load Recharts FunnelChart (chỉ dùng ở analytics)
// src/components/analytics/FunnelChart.tsx
import dynamic from 'next/dynamic'

const FunnelChartDynamic = dynamic(
  () => import('./FunnelChartInner').then((mod) => mod.FunnelChart),
  {
    ssr: false,             // Recharts dùng browser API — không SSR
    loading: () => <FunnelChartSkeleton />,
  }
)

export function FunnelChartContainer({ steps }: { steps: FunnelStep[] }) {
  return <FunnelChartDynamic steps={steps} />
}
```

```tsx
// ✅ — Lazy load Builder DnD (chỉ dùng ở /forms/[id]/builder)
// src/components/builder/BuilderShell.tsx
import dynamic from 'next/dynamic'

const BuilderDndProvider = dynamic(
  () => import('./BuilderDndProvider').then((mod) => mod.BuilderDndProvider),
  { ssr: false }
)
```

**Lazy load khi:**
- Thư viện > 50KB và chỉ dùng ở 1 route cụ thể
- Component dùng browser-only API (window, document, canvas)
- Heavy visualization (charts, maps, rich text editor)

**Không lazy load:**
- shadcn/ui components — đã tree-shaken, nhỏ
- Zustand store — phải load ngay
- React Hook Form + Zod — dùng ở nhiều trang

---

## 5. Selector Zustand — tránh re-render thừa

> Đã có trong rule `03-state.md` — nhắc lại vì liên quan trực tiếp đến performance Builder.

```tsx
// ✅ — Selector cụ thể → chỉ re-render khi selectedStepId thay đổi
const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)

// ❌ — Lấy toàn bộ store → re-render khi bất kỳ state nào thay đổi
const store = useBuilderStore()
```

---

## 6. Khi nào cần Profile trước khi tối ưu

Dùng **React DevTools Profiler** để đo trước khi thêm memo:
1. Record một interaction (typing trong builder, drag step)
2. Xem component nào re-render nhiều nhất
3. Chỉ memo những component render > 10ms hoặc render > 5 lần liên tiếp

```
React DevTools → Profiler → Record → Perform action → Stop
→ Xem "Ranked" chart để thấy component nào chậm nhất
```

**Ngoại lệ không cần profile trước:** List items trong Builder (`StepCard`, `FieldCard`) — đây là bottleneck đã biết trước, memo ngay.
