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

- Không có business logic
- Không gọi API, không đọc store
- Là các file do `npx shadcn@latest add` generate — **không sửa trực tiếp**

```
components/ui/
├── button.tsx
├── input.tsx
├── label.tsx
├── badge.tsx
├── card.tsx
├── dialog.tsx
├── select.tsx
└── separator.tsx
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

- Kết hợp 2+ atoms thành một đơn vị có ý nghĩa, dùng được ở nhiều nơi
- Có thể có local `useState` cho UI state (open/close, hover)
- Không gọi API, không đọc Zustand

```
components/common/
├── LoadingButton.tsx
├── FormField.tsx
├── EmptyState.tsx
├── ConfirmDialog.tsx
├── PageHeader.tsx
├── StatusBadge.tsx
└── CopyButton.tsx
```

```tsx
// ✅ — FormField: Label + Input + Error — dùng ở wizard VÀ builder
export function FormField({ label, error, required, helpText, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(required && "after:content-['*'] after:text-red-500 after:ml-0.5")}>
        {label}
      </Label>
      {children}
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

---

## Tầng 3 — Organisms (`components/[feature]/`)

- Tổng hợp molecules + atoms
- Được phép đọc Zustand store (organisms của builder)
- Đặt trong thư mục feature, không dùng chung tự do

```
components/
├── forms/
│   ├── FormGrid.tsx
│   └── FormCard.tsx
├── builder/
│   ├── containers/
│   ├── StepList.tsx
│   ├── StepCard.tsx
│   ├── StepCanvas.tsx
│   ├── FieldCard.tsx
│   ├── FieldLibrary.tsx
│   └── FieldSettingsPanel.tsx
└── analytics/
    ├── FunnelChart.tsx
    ├── ResponseTable.tsx
    └── SummaryCards.tsx
```

---

## Tầng 4 — Pages (`app/**/page.tsx`)

- Luôn là `default export` (Next.js yêu cầu)
- Server Component mặc định
- Không chứa JSX styling phức tạp — chỉ layout tổng thể

```tsx
// ✅ — Page: chỉ layout tổng thể + lắp Container
export default function FormsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Form của tôi" />
      <FormListContainer />
    </div>
  )
}
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
export function Button({ onClick, ...props }) {
  const { mutate } = useMutation(...)  // ❌ Atom không được fetch/mutate
}
```

```tsx
// ❌ — Molecule phụ thuộc vào feature cụ thể
export function FormCard() {
  const { data } = useQuery({ queryKey: ['forms'] })  // ❌ Molecule không fetch
}
```

```
// ❌ — Đặt component vào _components/ cùng route
// app/(auth)/register/_components/RegisterForm.tsx  ← SAI
// Đúng: components/auth/RegisterForm.tsx
//
// Lý do: _components/ là anti-pattern — component bị giam trong route,
// không tái sử dụng được dù sau này cần (vd: trang invite cũng cần form tương tự).
// Ngay cả component chỉ dùng 1 lần cũng phải đặt vào components/[feature]/ trước.
```
