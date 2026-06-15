# 06 — Quy tắc Styling với Tailwind CSS v4 + shadcn/ui

## 1. Dùng `cn()` để merge classes

`cn()` từ `@/lib/utils` là wrapper của `clsx + tailwind-merge`, xử lý conflict classes tự động.

```tsx
// ✅ — cn() merge class đúng cách
import { cn } from '@/lib/utils'

interface StepCardProps {
  isSelected: boolean
  className?: string
}

export function StepCard({ isSelected, className }: StepCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-md border cursor-pointer transition-colors',
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
        className  // cho phép override từ bên ngoài
      )}
    >
      ...
    </div>
  )
}
```

```tsx
// ❌ — Concatenate string thủ công: tailwind-merge không xử lý được conflict
function StepCard({ isSelected, className }) {
  const classes = `p-3 rounded-md border ${isSelected ? 'border-blue-500' : 'border-gray-200'} ${className}`
  // Nếu className = 'border-red-500' → cả 2 border-* tồn tại, CSS cuối thắng (không dự đoán được)
  return <div className={classes}>...</div>
}
```

```tsx
// ❌ — Template literal với condition phức tạp → khó đọc, không merge được
<div className={`p-3 ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'} ${isDisabled ? 'opacity-50' : ''}`}>
```

---

## 2. Không dùng inline style, trừ giá trị dynamic từ ThemeConfig

```tsx
// ✅ — Dynamic color từ ThemeConfig → CSS variable hoặc inline style được chấp nhận
import type { ThemeConfig } from '@flowform/types'

export function FormRenderer({ theme }: { theme: ThemeConfig }) {
  return (
    <div
      style={{
        // OK: giá trị đến từ user config, không thể biết trước để dùng Tailwind class
        '--color-primary': theme.primaryColor,
        '--color-bg': theme.backgroundColor,
        fontFamily: theme.fontFamily,
      } as React.CSSProperties}
      className="min-h-screen"
    >
      <button
        className="bg-[var(--color-primary)] text-white px-4 py-2 rounded"
      >
        Tiếp theo
      </button>
    </div>
  )
}
```

```tsx
// ❌ — Inline style cho giá trị tĩnh
<div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'white' }}>
  // Dùng: className="p-3 rounded-lg bg-white"
</div>
```

```tsx
// ❌ — Inline style để override Tailwind
<button style={{ color: 'red' }} className="text-blue-500">
  // Dùng: className="text-red-500"
</button>
```

---

## 3. Thứ tự class Tailwind

Thứ tự: **layout → spacing → sizing → typography → color → state/interaction**

```tsx
// ✅ — Thứ tự nhất quán, dễ scan
<div className="flex items-center gap-3 p-4 w-full h-12 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 focus-visible:ring-2 disabled:opacity-50">

// Breakdown:
// flex items-center gap-3     ← layout
// p-4                          ← spacing
// w-full h-12                  ← sizing
// text-sm font-medium          ← typography (size, weight)
// text-gray-700 bg-white       ← color
// border rounded-md            ← border
// hover:bg-gray-50             ← state
// focus-visible:ring-2         ← interaction
// disabled:opacity-50          ← disabled state
```

```tsx
// ❌ — Thứ tự ngẫu nhiên, khó đọc và diff
<div className="hover:bg-gray-50 text-gray-700 flex p-4 rounded-md bg-white text-sm w-full border h-12 items-center gap-3 font-medium">
```

---

## 4. Không tạo CSS file mới

Mọi styling qua Tailwind utility classes. **Không** tạo `StepCard.module.css`, `builder.css`, v.v.

```tsx
// ✅ — Thuần Tailwind
export function FieldCard({ field }: { field: FieldSchema }) {
  return (
    <div className="group flex items-center gap-2 p-3 rounded-md border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing">
      <span className="text-gray-400 group-hover:text-blue-500">
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm text-gray-700 truncate">{field.label}</span>
      {field.required && (
        <span className="text-xs text-red-500 font-medium">*</span>
      )}
    </div>
  )
}
```

```
// ❌ — Đừng tạo file CSS riêng
src/components/builder/FieldCard.module.css  ← KHÔNG TẠO
src/styles/builder.css                        ← KHÔNG TẠO
```

**Ngoại lệ duy nhất:** `src/app/globals.css` — chứa Tailwind base, CSS variables cho theme, và custom scrollbar nếu cần.

---

## 5. CSS variables trong `globals.css`

```css
/* src/app/globals.css */
@import "tailwindcss";

@layer base {
  :root {
    /* Theme colors — được override bởi ThemeConfig của từng form */
    --color-primary: #3b82f6;
    --color-primary-hover: #2563eb;
    --color-bg: #ffffff;
    --color-surface: #f9fafb;

    /* Builder UI colors — cố định, không thay đổi theo theme */
    --builder-sidebar-width: 256px;
    --builder-settings-width: 288px;
  }
}
```

```tsx
// ✅ — Dùng CSS variable trong Tailwind class
<div className="bg-[var(--color-surface)] border-[var(--color-primary)]">

// ✅ — Hoặc tham chiếu qua arbitrary value
<button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
```

---

## 6. Dark mode — chưa cần, không setup trước

Hiện tại FlowForm chưa có yêu cầu dark mode. **Không** thêm `dark:` variants vào class.

```tsx
// ❌ — Đừng thêm dark: variants khi chưa có yêu cầu
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// ✅ — Chỉ light mode
<div className="bg-white text-gray-900">
```

Khi có yêu cầu dark mode, sẽ thêm `darkMode: 'class'` vào Tailwind config và update `globals.css` một lần.

---

## 7. Responsive — mobile-first, breakpoints chuẩn

```tsx
// ✅ — Mobile-first: default là mobile, thêm breakpoint cho màn lớn hơn
export function FormsGrid({ forms }: { forms: FormSchema[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <FormCard key={form.id} form={form} />
      ))}
    </div>
  )
}
```

```tsx
// ❌ — Desktop-first (không dùng)
<div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
```

### Breakpoints dùng trong dự án
| Breakpoint | Width | Dùng khi |
|---|---|---|
| (none) | < 640px | Mobile default |
| `sm:` | ≥ 640px | Tablet nhỏ |
| `md:` | ≥ 768px | Tablet |
| `lg:` | ≥ 1024px | Desktop |
| `xl:` | ≥ 1280px | Desktop lớn (ít dùng) |

**Lưu ý:** Builder (`/forms/[id]/builder`) không cần responsive vì chỉ dùng trên desktop. Public form (`/f/[formId]`) phải responsive đến mobile.

---

## 8. cva — dùng cho component có nhiều variants

```tsx
// ✅ — Dùng cva khi component có nhiều variant combinations
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      status: {
        draft: 'bg-gray-100 text-gray-700',
        published: 'bg-green-100 text-green-700',
        archived: 'bg-yellow-100 text-yellow-700',
      },
    },
    defaultVariants: {
      status: 'draft',
    },
  }
)

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {status === 'published' ? 'Đã xuất bản' : status === 'draft' ? 'Nháp' : 'Lưu trữ'}
    </span>
  )
}
```

```tsx
// ❌ — If/else chain thay vì cva (khó mở rộng)
function StatusBadge({ status }) {
  let classes = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium '
  if (status === 'published') classes += 'bg-green-100 text-green-700'
  else if (status === 'draft') classes += 'bg-gray-100 text-gray-700'
  else classes += 'bg-yellow-100 text-yellow-700'
  return <span className={classes}>{status}</span>
}
```
