# 20 — Layout Decisions

> Rule này là "source of truth" cho layout của từng route group trong FlowForm web app.
> Mỗi khi tạo hoặc sửa `layout.tsx`, agent **bắt buộc** tra cứu bảng này trước,
> và **bắt buộc** ghi lại quyết định mới vào bảng sau khi implement.

---

## 1. Decision Log — Quyết định layout đã được thống nhất

> **Cập nhật bảng này mỗi khi tạo hoặc thay đổi layout.tsx của bất kỳ route group nào.**
> Ghi vào cùng commit với code thay đổi. Không để log out-of-date.

| Route group | File layout | Header/Nav | Scroll | Classnames chính | Lý do |
|---|---|---|---|---|---|
| `(auth)` | `app/(auth)/layout.tsx` | Không có | Page scroll | `min-h-screen flex items-center justify-center bg-gray-50` | Trang login/register cần focus vào form — header gây mất tập trung |
| `(dashboard)` | `app/(dashboard)/layout.tsx` | Có — `h-14` fixed top, brand + SignOutButton | Page scroll | Header: `h-14 border-b bg-white flex items-center justify-between px-6` · Main: `min-h-screen bg-gray-50` · Content: `p-6` | Dashboard cần brand visible và sign-out accessible mọi lúc |
| `(builder)` | `app/(builder)/layout.tsx` | Chưa tạo | Không scroll — full-screen | `h-screen flex overflow-hidden bg-gray-100` (3 cột: left aside w-64, main flex-1, right aside w-72) | Builder canvas cần không gian tối đa, scroll làm mất context |
| `(analytics)` | `app/(analytics)/layout.tsx` | Chưa tạo | Page scroll | TBD — quyết định khi implement | — |
| `f/[formId]` | Không có layout riêng | Không có | Page scroll | Xử lý trong `page.tsx`: `min-h-screen bg-gray-50 flex items-start justify-center pt-10 pb-20 px-4` | Public form — SSR, không cần auth nav |

---

## 2. Hướng dẫn tra cứu nhanh

**Trước khi tạo trang mới**, trả lời theo thứ tự:

1. Trang này thuộc route group nào? → Xem cột "Route group" ở bảng trên
2. Route group đó đã có `layout.tsx` chưa? → Nếu rồi, **dùng lại**, không tạo mới
3. Layout chưa có → tạo theo pattern trong cột "Classnames chính", ghi vào bảng sau khi xong

**Không bao giờ** tự suy ra layout pattern cho route group đã có — luôn đọc bảng trước.

---

## 3. Checklist nhất quán — kiểm tra trước khi commit

Dán checklist này vào PR description khi tạo/sửa layout:

- [ ] Layout nằm trong `layout.tsx`, không phải `page.tsx`
- [ ] `page.tsx` **không** chứa `min-h-screen`, `flex items-center justify-center`, hay bất kỳ full-page wrapper nào — đó là việc của `layout.tsx`
- [ ] Header pattern khớp với route group (xem bảng §1): auth = không có header, dashboard = `h-14`, builder = không có header
- [ ] Spacing dùng đúng scale: `p-6` cho content padding dashboard, `gap-4` giữa fields, `space-y-6` giữa sections
- [ ] Bảng §1 đã được cập nhật nếu tạo layout mới hoặc thay đổi classnames chính

---

## 4. Anti-patterns — KHÔNG làm

```tsx
// ❌ — Đặt full-page layout trong page.tsx
// app/(dashboard)/forms/page.tsx
export default function FormsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center">  {/* ❌ thuộc layout.tsx */}
      ...
    </div>
  )
}
```

```tsx
// ❌ — Thêm header vào (auth) layout
// app/(auth)/layout.tsx
export default function AuthLayout({ children }) {
  return (
    <div>
      <header className="h-14 border-b bg-white">FlowForm</header>  {/* ❌ auth không có header */}
      <main className="flex items-center justify-center">{children}</main>
    </div>
  )
}
```

```tsx
// ❌ — Tạo layout mới cho từng page trong cùng route group
// app/(dashboard)/forms/layout.tsx  ← ❌ thừa, (dashboard)/layout.tsx đã cover
// app/(dashboard)/settings/layout.tsx  ← ❌ thừa
// Chỉ có 1 layout.tsx cho mỗi route group
```

```tsx
// ❌ — Bịa spacing ngoài scale hoặc khác với route group cùng loại
// Dashboard page A: p-4, Dashboard page B: p-8  ← ❌ phải đồng nhất p-6
// Builder aside A: w-60, Builder aside B: w-72  ← ❌ quyết định rồi thì dùng nhất quán
```

---

## 5. Pattern chuẩn từng route group

### `(auth)` — Centered, no nav

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  )
}
```

### `(dashboard)` — Header + scrollable main

```tsx
// app/(dashboard)/layout.tsx
import { SignOutButton } from '@/components/auth/SignOutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 border-b bg-white flex items-center justify-between px-6">
        <span className="font-semibold text-gray-900">FlowForm</span>
        <SignOutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

### `(builder)` — Full-screen, 3 columns, no scroll

```tsx
// app/(builder)/layout.tsx
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {children}
    </div>
  )
}
// Các cột (left aside w-64, main flex-1, right aside w-72) nằm trong page.tsx hoặc component
// layout.tsx chỉ tạo full-screen container
```
