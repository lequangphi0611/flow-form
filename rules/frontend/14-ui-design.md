# 14 — UI Design

> Rule này bổ sung cho `06-styling.md` (Tailwind/shadcn conventions).
> Focus vào hệ thống thiết kế: typography, spacing, màu sắc, pattern UI tái sử dụng.

---

## 1. Typography — Thang chữ

Dùng Inter (đã setup trong `layout.tsx`). Không dùng font khác trừ khi `ThemeConfig` của form yêu cầu.

| Class | Size | Weight | Dùng cho |
|---|---|---|---|
| `text-2xl font-bold` | 24px / 700 | Page title (h1) |
| `text-xl font-semibold` | 20px / 600 | Section title (h2) |
| `text-lg font-semibold` | 18px / 600 | Card title, Step title |
| `text-base font-medium` | 16px / 500 | Label, button text |
| `text-sm` | 14px / 400 | Body text, description |
| `text-xs` | 12px / 400 | Caption, helper text, badge |

```tsx
// ✅ — Áp dụng đúng hierarchy
export function FormCard({ form }: { form: FormSchema }) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-2">
      <h3 className="text-base font-semibold text-gray-900 truncate">{form.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{form.description}</p>
      <span className="text-xs text-gray-400">
        {form.steps.length} bước · {form.published ? 'Đã xuất bản' : 'Nháp'}
      </span>
    </div>
  )
}
```

```tsx
// ❌ — Text hierarchy sai, page title nhỏ hơn card title
<h1 className="text-base font-medium">Form của tôi</h1>  // ❌ quá nhỏ cho h1
<h3 className="text-2xl font-bold">{form.title}</h3>      // ❌ quá to cho card
```

**Màu chữ theo ngữ cảnh:**

```
text-gray-900   ← nội dung chính, tiêu đề
text-gray-700   ← nội dung thứ cấp, label
text-gray-500   ← mô tả, placeholder hint
text-gray-400   ← caption, metadata, disabled hint
text-red-600    ← lỗi validation
text-blue-600   ← link, interactive text
```

---

## 2. Spacing — Hệ thống khoảng cách

Dùng theo bội số của 4px (Tailwind scale). Không dùng giá trị ngoài scale (`p-[13px]`).

| Scale | px | Dùng cho |
|---|---|---|
| `gap-1` / `space-y-1` | 4px | Khoảng cách cực nhỏ (icon + text) |
| `gap-2` / `space-y-2` | 8px | Trong 1 component (label → input) |
| `gap-3` / `space-y-3` | 12px | Giữa các element trong 1 group |
| `gap-4` / `space-y-4` | 16px | Giữa các field trong form |
| `gap-6` / `space-y-6` | 24px | Giữa các section trong trang |
| `gap-8` / `space-y-8` | 32px | Giữa các block lớn |
| `p-4` | 16px | Padding card nhỏ |
| `p-6` | 24px | Padding card thông thường |
| `p-8` | 32px | Padding card lớn / page padding |

```tsx
// ✅ — Spacing nhất quán trong form
<div className="space-y-4">           {/* 16px giữa các field */}
  <FormField label="Họ và tên">
    <div className="flex items-center gap-2">  {/* 8px giữa icon và input */}
      <User className="h-4 w-4 text-gray-400" />
      <Input {...register('name')} />
    </div>
  </FormField>
  <FormField label="Email">
    <Input {...register('email')} type="email" />
  </FormField>
</div>
```

---

## 3. Màu sắc — Semantic colors

Dùng màu có ý nghĩa nhất quán. Không dùng màu bừa bãi.

### Màu hành động (interactive)

```
bg-blue-500 / hover:bg-blue-600     ← Primary action (Tạo, Lưu, Xuất bản)
bg-white border / hover:bg-gray-50  ← Secondary action (Hủy, Quay lại)
bg-red-500 / hover:bg-red-600       ← Destructive (Xóa)
bg-gray-100 text-gray-500           ← Disabled
```

### Màu trạng thái (status)

```
bg-green-100  text-green-700   ← Success, Published
bg-yellow-100 text-yellow-700  ← Warning, Draft, Pending
bg-red-100    text-red-700     ← Error, Failed
bg-blue-100   text-blue-700    ← Info, In progress
bg-gray-100   text-gray-700    ← Neutral, Archived
```

```tsx
// ✅ — Dùng cva để map màu theo trạng thái (xem 06-styling.md#8)
const statusVariants = cva('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', {
  variants: {
    status: {
      published: 'bg-green-100 text-green-700',
      draft:     'bg-gray-100 text-gray-700',
      archived:  'bg-yellow-100 text-yellow-700',
    },
  },
})
```

### Màu border và background

```
bg-white          ← Card, panel, dialog
bg-gray-50        ← Page background, hover state
bg-gray-100       ← Skeleton, disabled input background
border-gray-200   ← Default border
border-gray-300   ← Input border
border-blue-500   ← Selected / focused border
```

### Button hover — dùng `brightness` filter cho destructive, không dùng opacity shorthand

`hover:bg-destructive/90` tạo ra màu `destructive` pha với màu nền trắng — kết quả là button **sáng hơn** khi hover, ngược với UX expectation (user expect tối hơn = pressed/dangerous).

```tsx
// ✅ — Dùng CSS filter để tối 10% (không phụ thuộc màu nền)
destructive: "bg-destructive text-destructive-foreground hover:brightness-90 transition-[filter,colors]"

// ❌ — /90 trên nền trắng sẽ pha loãng màu → sáng hơn, không phải tối hơn
destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
```

Khi dùng `hover:brightness-*`, phải thêm `transition-[filter,colors]` vào class list (không phải `transition-colors` đơn thuần — cái đó không animate `filter`).

### Button cursor — luôn explicit `cursor-pointer`

Browser default cho `<button>` là `cursor: default`, không phải `cursor: pointer`. shadcn không set cursor mặc định. Phải khai báo explicit trong base class của `buttonVariants`.

```tsx
// ✅ — Base class của buttonVariants
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center ... disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  { ... }
)
```

- `cursor-pointer` — tất cả button ở trạng thái bình thường
- `disabled:cursor-not-allowed` — giữ visual cue ngay cả khi `pointer-events-none` đã tắt click; browser vẫn render cursor từ style kể cả khi pointer-events bị disable

### CSS variable color token — phải khai báo ở hai chỗ trong globals.css

Tailwind v4 dùng `@theme inline` để map CSS variable sang utility class. Nếu chỉ khai báo giá trị trong `:root` mà không map vào `@theme inline`, class `text-*` / `bg-*` tương ứng sẽ **không được generate** — Tailwind fallback về `--foreground` hoặc transparent.

```css
/* globals.css */

/* Bước 1: khai báo giá trị trong :root */
:root {
  --destructive-foreground: oklch(0.985 0 0);
  /* ... các token khác */
}

/* Bước 2: map vào @theme inline để Tailwind generate utility class */
@theme inline {
  --color-destructive-foreground: var(--destructive-foreground);
  /* ... */
}
```

Thiếu bước 2: `text-destructive-foreground` compile thành `color: var(--color-destructive-foreground)` nhưng biến `--color-destructive-foreground` không tồn tại → browser dùng `currentColor` hoặc inherited color (thường là màu tối → chữ tối trên nền đỏ, không đọc được).

Áp dụng cho mọi color token tự thêm ngoài bộ mặc định shadcn CLI cung cấp.

---

## 4. Sizing — Kích thước component

### Button sizes

```tsx
// Dùng theo shadcn size variants
<Button size="sm">   {/* Compact action trong list item */}
<Button size="default"> {/* Default — hầu hết trường hợp */}
<Button size="lg">   {/* CTA nổi bật — "Tạo form mới", "Xuất bản" */}
<Button size="icon"> {/* Icon-only button */}
```

### Input sizes — dùng `h-9` / `h-10` / `h-11`

```tsx
// ✅ — h-9 cho compact forms (settings panel trong builder)
<Input className="h-9 text-sm" {...register('title')} />

// ✅ — h-10 default (hầu hết forms)
<Input {...register('email')} />  // shadcn default = h-10

// ✅ — h-11 cho form nổi bật (public form end-user điền)
<Input className="h-11 text-base" {...register('name')} />
```

### Icon sizes — nhất quán với text

```tsx
// ✅ — Icon phải cân đối với text xung quanh
<p className="text-sm flex items-center gap-1.5">
  <CheckCircle className="h-4 w-4 text-green-500" />  {/* text-sm → icon h-4 w-4 */}
  Đã lưu
</p>

<h2 className="text-xl flex items-center gap-2">
  <Settings className="h-5 w-5" />                    {/* text-xl → icon h-5 w-5 */}
  Cài đặt
</h2>
```

---

## 5. Layout patterns cho từng route

### Dashboard — `(dashboard)/`

```tsx
// ✅ — Layout chuẩn cho dashboard page
export default function FormsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header: title + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi các form</p>
        </div>
        <Button>Tạo form mới</Button>
      </div>

      {/* Content */}
      <FormListContainer />
    </div>
  )
}
```

### Builder — `(builder)/` — full-screen, không scroll

```tsx
// ✅ — Builder chiếm toàn màn hình, 3 cột cố định
export default function BuilderPage() {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <aside className="w-64 flex-shrink-0 border-r bg-white overflow-y-auto">
        <StepList />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <BuilderCanvasContainer />
      </main>

      <aside className="w-72 flex-shrink-0 border-l bg-white overflow-y-auto">
        <FieldSettingsContainer />
      </aside>
    </div>
  )
}
```

### Public form — `f/[formId]` — centered, max-width

```tsx
// ✅ — Form public căn giữa, max-width để dễ đọc
export default async function PublicFormPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-10 pb-20 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border p-8">
        <FormEngine form={form} />
      </div>
    </div>
  )
}
```

---

## 6. Loading states

Ba loại loading state — dùng đúng loại theo ngữ cảnh.

### Skeleton — khi biết shape của content

```tsx
// ✅ — Skeleton giống hình dạng content thật
export function FormCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3 animate-pulse">
      <div className="h-4 w-3/4 bg-gray-200 rounded" />   {/* title */}
      <div className="h-3 w-full bg-gray-100 rounded" />   {/* description line 1 */}
      <div className="h-3 w-2/3 bg-gray-100 rounded" />    {/* description line 2 */}
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />  {/* badge */}
        <div className="h-5 w-12 bg-gray-100 rounded-full" />  {/* badge */}
      </div>
    </div>
  )
}

export function FormGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <FormCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

### Spinner — khi action đang xử lý (mutation)

```tsx
// ✅ — Spinner trong button khi đang submit
import { Loader2 } from 'lucide-react'

<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
</Button>
```

### Progress bar — khi upload file hoặc bước dài

```tsx
// ✅ — Progress bar trong wizard form
<div className="w-full bg-gray-100 rounded-full h-1.5">
  <div
    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
  />
</div>
```

**Quy tắc:**
- Loading state cho data fetch → **Skeleton** (không dùng spinner toàn trang)
- Loading state cho mutation (button) → **Spinner trong button** + `disabled`
- Không dùng `Loading...` text thô — dùng skeleton hoặc spinner có thiết kế

---

## 7. Empty states

Ba trường hợp riêng biệt — UI khác nhau.

```tsx
// ✅ — Empty: chưa có data, cần action để tạo
<EmptyState
  title="Chưa có form nào"
  description="Tạo form đầu tiên để bắt đầu thu thập dữ liệu từ khách hàng."
  action={<Button onClick={onCreateForm}>Tạo form mới</Button>}
/>

// ✅ — No results: search/filter không có kết quả
<EmptyState
  title="Không tìm thấy form nào"
  description={`Không có form nào phù hợp với "${searchQuery}".`}
  action={<Button variant="outline" onClick={onClearSearch}>Xóa bộ lọc</Button>}
/>

// ✅ — Error: lỗi khi tải (kết hợp với isError — xem 13-error-handling.md)
<EmptyState
  title="Không tải được dữ liệu"
  description="Vui lòng kiểm tra kết nối và thử lại."
  action={<Button variant="outline" onClick={() => refetch()}>Thử lại</Button>}
/>
```

---

## 8. Icons — chỉ dùng lucide-react

```tsx
// ✅ — Import đúng icon từ lucide-react
import { Plus, Trash2, Settings, GripVertical, ChevronRight, Eye } from 'lucide-react'

// Size chuẩn
<Plus className="h-4 w-4" />           {/* button icon */}
<Settings className="h-5 w-5" />       {/* heading icon */}
<GripVertical className="h-4 w-4" />   {/* drag handle */}
```

```tsx
// ❌ — Không dùng nhiều icon library khác nhau
import { FaPlus } from 'react-icons/fa'    // ❌
import PlusIcon from '@heroicons/react/...' // ❌
```

**Icons thường dùng trong FlowForm:**

| Action | Icon |
|---|---|
| Thêm | `Plus` |
| Xóa | `Trash2` |
| Sửa | `Pencil` |
| Cài đặt | `Settings` |
| Kéo thả | `GripVertical` |
| Xuất bản | `Eye` |
| Sao chép | `Copy` |
| Đóng | `X` |
| Mở rộng | `ChevronDown` |
| Thu gọn | `ChevronUp` |
| Analytics | `BarChart2` |
| Form | `FileText` |
| Người dùng | `User` |

---

## 9. Accessibility tối thiểu

```tsx
// ✅ — Button icon-only phải có aria-label
<Button size="icon" aria-label="Xóa bước">
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ — Input có id tương ứng với label
<label htmlFor="form-title">Tiêu đề form</label>
<input id="form-title" {...register('title')} />

// ✅ — Error state đánh dấu aria-invalid
<input {...register('email')} aria-invalid={!!errors.email} aria-describedby="email-error" />
{errors.email && <p id="email-error" role="alert">{errors.email.message}</p>}

// ✅ — Loading state thông báo cho screen reader
<Button disabled={isPending} aria-busy={isPending}>
  {isPending ? 'Đang lưu...' : 'Lưu'}
</Button>

// ✅ — Dialog có focus trap tự động (shadcn/ui Dialog dựa trên Radix — đã có sẵn)
<Dialog>
  <DialogContent>  {/* focus tự động trap vào đây */}
    ...
  </DialogContent>
</Dialog>
```

---

## 10. Animation — tinh tế, không quá mức

```tsx
// ✅ — Transition nhẹ cho interactive states
'transition-colors duration-150'     // hover color change
'transition-all duration-200'        // hover with shadow/border
'transition-opacity duration-200'    // fade in/out
'animate-pulse'                      // skeleton loading
'animate-spin'                       // spinner

// ✅ — Progress bar smooth
'transition-all duration-300'        // width change trong wizard progress

// ❌ — Không dùng animation phức tạp gây distraction
'animate-bounce'    // quá mạnh
'animate-ping'      // chỉ dùng cho notification dot
```

**Nguyên tắc:** Animation tồn tại để hướng dẫn người dùng, không để show off. Duration không quá 300ms.
