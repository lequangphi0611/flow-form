---
name: design-ui
description: UI designer skill for FlowForm web app. Use when asked to design, wireframe, or plan the interface of a page or feature. Input can be a User Story, a page name, or a route path. Outputs an ASCII wireframe with shadcn component annotations.
---

# /design-ui — UI Designer cho FlowForm

Skill này đóng vai **UI designer**: nhận mô tả tính năng hoặc tên trang, rồi output wireframe ASCII kèm shadcn component cụ thể. Dừng tại wireframe — không generate code, không tạo plan.

---

## Cách dùng

```
/design-ui <mô tả tính năng hoặc tên trang>
```

**Ví dụ:**
```
/design-ui Trang danh sách form với search và pagination
/design-ui US-003: Form builder canvas với left panel và right panel
/design-ui /forms/[id]/analytics
```

---

## Quy trình thực hiện

### Bước 1 — Đọc context

Đọc các file sau trước khi thiết kế (không skip):

1. `rules/frontend/20-layout-decisions.md` — Route group → layout pattern đã được quyết định
2. `rules/frontend/14-ui-design.md` — Typography, spacing, màu sắc, pattern chuẩn
3. `apps/web/src/components/ui/` — Liệt kê shadcn components đã cài (`ls` thư mục)
4. Nếu có User Story → đọc kỹ Acceptance Criteria

### Bước 2 — Hỏi nếu thiếu thông tin

Chỉ hỏi khi KHÔNG đủ thông tin để thiết kế. Tối đa 2 câu hỏi:
- Route group này thuộc `(dashboard)`, `(builder)`, hay `(auth)`?
- Có data nào cần hiển thị mà chưa rõ (danh sách? form? chart?)?

### Bước 3 — Output wireframe

Output theo format chuẩn bên dưới. Không thêm code, không thêm plan.

---

## Output format chuẩn

```
## Wireframe: [Tên trang]
Route: [path]  |  Route group: [(name)]  |  Layout: [pattern từ rule 20]

┌─────────────────────────────────────────────────────────────┐
│  [ASCII wireframe — dùng ký tự box drawing: ┌─┐│└┘├┤┬┴┼]  │
│  Ghi rõ từng vùng: HEADER / SIDEBAR / CONTENT / FOOTER     │
│  Trong mỗi vùng: mô tả element và shadcn component tương ứng│
└─────────────────────────────────────────────────────────────┘

### Shadcn components cần dùng
| Component | Shadcn | Cần cài chưa? |
|---|---|---|
| Nút tạo form | `<Button>` | ✅ đã có |
| Ô tìm kiếm | `<Input>` | ✅ đã có |
| Dropdown filter | `<Select>` | ⚠️ chưa cài — npx shadcn add select |

### Interactions
- [Mô tả ngắn các interaction chính: click, hover, empty state, loading state]

### Ghi chú thiết kế
- [Quyết định thiết kế nào cần ghi vào rule 20 sau khi implement]
```

---

## Shadcn components đã cài (tính đến lần update cuối)

> **Luôn `ls apps/web/src/components/ui/`** để lấy danh sách mới nhất thay vì tin vào list này.

| Component | File | Dùng cho |
|---|---|---|
| Button | `button.tsx` | Mọi action button |
| Input | `input.tsx` | Text input, search, password |
| Label | `label.tsx` | Form label (thường dùng qua FormField) |

Components chưa cài — cần `npx shadcn add <name>` khi thiết kế yêu cầu:
`card`, `dialog`, `select`, `table`, `badge`, `tabs`, `skeleton`, `avatar`, `dropdown-menu`, `sheet`, `tooltip`, `checkbox`, `switch`, `textarea`, `pagination`, `breadcrumb`, `separator`

---

## Ràng buộc thiết kế bắt buộc

Wireframe PHẢI tuân theo:

1. **Layout theo route group** — tra `rules/frontend/20-layout-decisions.md`, không bịa pattern mới
2. **Spacing chuẩn** — `p-6` content padding dashboard, `space-y-4` giữa fields, `gap-4` grid
3. **Typography scale** — `text-2xl font-bold` cho h1, `text-sm text-gray-500` cho description
4. **Màu semantic** — `text-blue-600` link, `text-red-600` error, `text-gray-900` content chính
5. **Chỉ dùng lucide-react** cho icon — không đề xuất icon từ library khác
6. **Không thiết kế quá 1 màn hình / 1 lần** — nếu task có nhiều trang, hỏi trang nào trước

---

## Ví dụ output

### Input: `/design-ui Trang danh sách form`

```
## Wireframe: Forms List Page
Route: /forms  |  Route group: (dashboard)  |  Layout: Header h-14 + main p-6

┌─────────────────────────────────────────────────────────────────┐
│ DASHBOARD LAYOUT (từ rule 20 — không thay đổi)                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [FlowForm]                          [Đăng xuất <Button>]   │ │
│ │                    HEADER h-14                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ MAIN CONTENT (p-6 max-w-7xl mx-auto space-y-6)                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PAGE HEADER                                                 │ │
│ │ Form của tôi          [+ Tạo form mới <Button size="lg">]  │ │
│ │ text-2xl font-bold    Quản lý và theo dõi các form         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FILTER BAR (flex gap-3)                                     │ │
│ │ [🔍 Tìm kiếm form... <Input>      ] [Trạng thái <Select>]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ FORM CARD    │ │ FORM CARD    │ │ FORM CARD    │ ...        │
│ │ <Card>       │ │ <Card>       │ │ <Card>       │            │
│ │ Tiêu đề form │ │ Tiêu đề form │ │ Tiêu đề form │            │
│ │ text-base    │ │              │ │              │            │
│ │ font-semibold│ │              │ │              │            │
│ │ 3 bước · ... │ │              │ │              │            │
│ │ [Đã xuất bản]│ │ [Nháp]       │ │ [Đã xuất bản]│            │
│ │ <Badge>green │ │ <Badge>gray  │ │ <Badge>green │            │
│ │ [Sửa][Xóa]  │ │ [Sửa][Xóa]  │ │ [Sửa][Xóa]  │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│  grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4              │
│                                                                 │
│ [← 1 2 3 ... →  <Pagination>]          Hiển thị 1-12 / 48    │
└─────────────────────────────────────────────────────────────────┘

EMPTY STATE (khi không có form nào):
┌─────────────────────────────────────────────────────────────────┐
│              [FileText icon h-12 w-12 text-gray-300]            │
│                    Chưa có form nào                             │
│           text-lg font-semibold text-gray-900                   │
│     Tạo form đầu tiên để bắt đầu thu thập dữ liệu             │
│                  text-sm text-gray-500                          │
│              [+ Tạo form mới <Button>]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Shadcn components cần dùng
| Component | Shadcn | Cần cài chưa? |
|---|---|---|
| Nút action | `<Button>` | ✅ đã có |
| Search box | `<Input>` | ✅ đã có |
| Filter status | `<Select>` | ⚠️ chưa cài — `npx shadcn add select` |
| Form card | `<Card>` | ⚠️ chưa cài — `npx shadcn add card` |
| Status tag | `<Badge>` | ⚠️ chưa cài — `npx shadcn add badge` |
| Phân trang | `<Pagination>` | ⚠️ chưa cài — `npx shadcn add pagination` |

### Interactions
- Card hover: `hover:shadow-md transition-shadow`
- Xóa form: confirm Dialog trước khi xóa
- Loading state: `<FormCardSkeleton>` grid (rule 14 §6)
- Filter/search: debounce 300ms, cập nhật URL params (rule 19)

### Ghi chú thiết kế
- Forms list page dùng `(dashboard)` layout — không cần thêm vào rule 20 vì layout đã có
- Grid responsive: 1 cột mobile → 2 cột tablet → 3 cột desktop
