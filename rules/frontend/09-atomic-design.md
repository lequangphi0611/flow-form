# 09 — Atomic Design

## Tổng quan

Atomic Design được điều chỉnh cho Next.js App Router + shadcn/ui. Bỏ tầng **Templates** vì Next.js `layout.tsx` đã đảm nhiệm vai trò đó.

```
Atoms       →  components/ui/          (shadcn/ui primitives)
Molecules   →  components/common/      (kết hợp atoms, dùng chung toàn app)
Organisms   →  components/[feature]/   (phức tạp, gắn với feature)
(Templates) →  app/**/layout.tsx       (Next.js layout thay thế)
Pages       →  app/**/page.tsx         (Next.js pages)
```

---

## Tầng 1 — Atoms (`components/ui/`)

**Là gì:** Đơn vị UI nhỏ nhất, không thể chia nhỏ hơn.

**Đặc điểm:**
- Không có business logic
- Không gọi API, không đọc store
- Props hoàn toàn generic
- Là các file do `npx shadcn@latest add` generate — **không sửa trực tiếp**

```
components/ui/
├── button.tsx       ← shadcn
├── input.tsx        ← shadcn
├── label.tsx        ← shadcn
├── badge.tsx        ← shadcn
├── card.tsx         ← shadcn
├── dialog.tsx       ← shadcn
├── select.tsx       ← shadcn
└── separator.tsx    ← shadcn
```

**Khi cần custom atom:** Tạo file mới trong `components/common/` — không sửa file trong `ui/`.

```tsx
// ✅ — Custom atom: extend shadcn Button
// src/components/common/LoadingButton.tsx
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
}

export function LoadingButton({ loading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
```

---

## Tầng 2 — Molecules (`components/common/`)

**Là gì:** Kết hợp 2+ atoms thành một đơn vị có ý nghĩa, dùng được ở nhiều nơi.

**Đặc điểm:**
- Kết hợp atoms với nhau
- Có thể có local `useState` cho UI state (open/close, hover)
- Không gọi API, không đọc Zustand
- Dùng được ở nhiều feature khác nhau

```
components/common/
├── LoadingButton.tsx       ← Button + Loader icon
├── FormField.tsx           ← Label + Input + ErrorMessage
├── EmptyState.tsx          ← Illustration + Title + CTA
├── ConfirmDialog.tsx       ← Dialog + confirm/cancel buttons
├── PageHeader.tsx          ← Title + Description + Actions slot
├── StatusBadge.tsx         ← Badge với màu theo trạng thái
└── CopyButton.tsx          ← Button + copy-to-clipboard logic
```

### Ví dụ Molecule: FormField

```tsx
// ✅ — FormField: Label + Input + Error — dùng ở wizard renderer VÀ builder settings
// src/components/common/FormField.tsx
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  helpText?: string
  children: React.ReactNode  // nhận Input hoặc Select hoặc bất kỳ atom nào
}

export function FormField({ label, error, required, helpText, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(required && "after:content-['*'] after:text-red-500 after:ml-0.5")}>
        {label}
      </Label>
      {children}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

// Dùng:
<FormField label="Họ và tên" error={errors.name?.message} required>
  <Input {...register('name')} placeholder="Nguyễn Văn A" />
</FormField>
```

### Ví dụ Molecule: EmptyState

```tsx
// src/components/common/EmptyState.tsx
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <p className="text-lg font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

---

## Tầng 3 — Organisms (`components/[feature]/`)

**Là gì:** Các section UI phức tạp, gắn với một feature cụ thể.

**Đặc điểm:**
- Tổng hợp molecules + atoms
- Được phép đọc Zustand store (organisms của builder)
- Có thể chứa Container logic (hoặc nhận data từ Container cha)
- Đặt trong thư mục feature, không dùng chung tự do

```
components/
├── forms/                   ← Organisms của feature "quản lý form"
│   ├── FormGrid.tsx         ← grid + FormCard
│   ├── FormCard.tsx         ← card hiển thị 1 form
│   └── FormGridSkeleton.tsx ← loading state
│
├── builder/                 ← Organisms của feature "builder"
│   ├── containers/          ← Containers (xem rule 08)
│   ├── StepList.tsx         ← danh sách steps có drag & drop
│   ├── StepCard.tsx         ← 1 step item trong list
│   ├── StepCanvas.tsx       ← vùng canvas render step đang chọn
│   ├── FieldCard.tsx        ← 1 field item trong canvas
│   ├── FieldLibrary.tsx     ← bảng chọn loại field để thêm vào step
│   └── FieldSettingsPanel.tsx ← panel cài đặt field đang chọn
│
└── analytics/               ← Organisms của feature "analytics"
    ├── FunnelChart.tsx      ← biểu đồ phễu (Recharts)
    ├── ResponseTable.tsx    ← bảng danh sách responses
    └── SummaryCards.tsx     ← cards hiển thị tổng hợp stats
```

### Ví dụ Organism: StepList (Builder)

```tsx
// src/components/builder/StepList.tsx
'use client'

import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBuilderStore } from '@/store/builder.store'
import { StepCard } from './StepCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function StepList() {
  const steps = useBuilderStore((s) => s.form?.steps ?? [])
  const addStep = useBuilderStore((s) => s.addStep)
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = steps.findIndex((s) => s.id === active.id)
    const to = steps.findIndex((s) => s.id === over.id)
    reorderSteps(from, to)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium">Các bước</span>
        <Button size="sm" variant="ghost" onClick={addStep}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {steps.length === 0 ? (
        <EmptyState
          title="Chưa có bước nào"
          description="Nhấn + để thêm bước đầu tiên"
          className="flex-1"
        />
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1">
              {steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
```

### Ví dụ Organism: FunnelChart (Analytics)

```tsx
// src/components/analytics/FunnelChart.tsx
import { FunnelChart as RechartsFunnel, Funnel, Tooltip, LabelList } from 'recharts'
import type { FunnelStep } from '@flowform/types'

interface FunnelChartProps {
  steps: FunnelStep[]
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const data = steps.map((step) => ({
    name: step.title,
    value: step.views,
    fill: `hsl(${220 - step.stepIndex * 20}, 70%, 60%)`,
  }))

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Tỷ lệ hoàn thành từng bước</h3>
      <RechartsFunnel width={500} height={300} data={data}>
        <Tooltip formatter={(value, name) => [`${value} lượt`, name]} />
        <Funnel dataKey="value">
          <LabelList position="center" fill="#fff" fontSize={12} />
        </Funnel>
      </RechartsFunnel>
    </div>
  )
}
```

---

## Tầng 4 — Pages (`app/**/page.tsx`)

**Là gì:** Next.js page files — lắp ghép Containers và Organisms thành trang hoàn chỉnh.

**Đặc điểm:**
- Luôn là `default export` (Next.js yêu cầu)
- Server Component mặc định — chỉ thêm `'use client'` nếu thực sự cần
- Fetch data ở đây (server-side) hoặc delegate cho Container
- Không chứa JSX styling phức tạp — chỉ layout tổng thể

```tsx
// ✅ — Page: chỉ layout tổng thể + lắp Container
// src/app/(dashboard)/forms/page.tsx
import { FormListContainer } from '@/components/forms/containers/FormListContainer'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function FormsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Form của tôi"
        description="Quản lý và theo dõi tất cả form"
        action={
          <Button asChild>
            <Link href="/forms/new">Tạo form mới</Link>
          </Button>
        }
      />
      <FormListContainer />
    </div>
  )
}
```

---

## Cây component đầy đủ — ví dụ Builder page

```
BuilderPage (Page — page.tsx)
└── BuilderShell (Organism — layout 3 cột)
    ├── LeftPanel
    │   └── StepList (Organism — dnd-kit + store)
    │       └── StepCard[] (Organism — sortable item)
    │           ├── Badge (Atom)
    │           └── DropdownMenu (Atom)
    ├── BuilderCanvasContainer (Container)
    │   └── StepCanvas (Organism)
    │       └── FieldCard[] (Organism)
    │           ├── FormField (Molecule)
    │           │   ├── Label (Atom)
    │           │   └── Input (Atom)
    │           └── LoadingButton (Molecule custom Atom)
    └── FieldSettingsContainer (Container)
        └── FieldSettingsPanel (Organism)
            ├── FormField[] (Molecule)
            ├── Select (Atom)
            └── Separator (Atom)
```

---

## Checklist phân loại component

Khi tạo component mới, trả lời theo thứ tự:

1. **Có phải shadcn primitive?** → `components/ui/` (Atom)
2. **Dùng được ở nhiều feature, không fetch, không store?** → `components/common/` (Molecule)
3. **Gắn với 1 feature cụ thể?** → `components/[feature]/` (Organism)
4. **Cần fetch API hoặc kết nối store?** → `components/[feature]/containers/` (Container, xem rule 08)
5. **Là entry point của route?** → `app/**/page.tsx` (Page)

---

## Những điều KHÔNG làm

```tsx
// ❌ — Atom có business logic
// components/ui/button.tsx (sửa file shadcn)
export function Button({ onClick, ...props }) {
  const { mutate } = useMutation(...)  // ❌ Atom không được fetch/mutate
  return <button onClick={() => mutate()} {...props} />
}
```

```tsx
// ❌ — Molecule phụ thuộc vào feature cụ thể
// components/common/FormCard.tsx
export function FormCard() {
  const { data } = useQuery({ queryKey: ['forms'] })  // ❌ Molecule không fetch
  return <div>{data?.title}</div>
}
```

```tsx
// ❌ — Page chứa logic phức tạp thay vì dùng Container
// app/(dashboard)/forms/page.tsx
export default function FormsPage() {
  const [forms, setForms] = useState([])
  useEffect(() => {
    fetch('/api/forms').then(r => r.json()).then(setForms)  // ❌ logic này thuộc Container
  }, [])
  return forms.map(...)
}
```

```tsx
// ❌ — Organism trong components/common/ (quá gắn với feature để là molecule)
// components/common/StepList.tsx  ← sai chỗ, phải là components/builder/StepList.tsx
export function StepList() {
  const steps = useBuilderStore(...)  // Đọc builder store → đây là Organism của builder
}
```
