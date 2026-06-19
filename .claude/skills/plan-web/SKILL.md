---
name: plan-web
description: >
  Generate a detailed Next.js/React implementation plan for a web-layer sub-story,
  present it for approval, then implement after confirmation. Use for US-{id}{letter}
  tasks where layer=web. Invoke with /plan-web US-004b, or when implementing a
  web-layer task from a /breakdown output.
---

# /plan-web — Web Implementation Plan

**Input:** sub-story ID — ví dụ `/plan-web US-004b`
**Flow:** Read story → load FE rules → design wireframe → gen plan → approve gate → implement

---

## Step 1 — Đọc story

Tìm file `po-requests/sprint-*/US-{id}*.md`. Nếu không có file, dùng mô tả từ chat.

Đọc kỹ:
- Acceptance Criteria (chỉ phần liên quan đến layer `web`)
- Technical Notes (component, hook, page, store)
- `depends_on` frontmatter — kiểm tra api task đã xong chưa (web thường phụ thuộc api)

## Step 2 — Load rules liên quan

Trước khi viết plan, đọc **bắt buộc**:
1. `apps/web/CLAUDE.md` — stack, cấu trúc thư mục, quy tắc quan trọng của layer này
2. Các rule cụ thể bên dưới **nếu chưa đọc trong session này**:

| Rule | Đọc khi |
|---|---|
| `rules/frontend/01-conventions.md` | Tạo file mới bất kỳ |
| `rules/frontend/08-presenter-container.md` | Component có useQuery/useMutation/router/signIn |
| `rules/frontend/09-atomic-design.md` | Tạo component mới (quyết định đặt ở đâu) |
| `rules/frontend/04-data-fetching.md` | Có fetch data hoặc mutation |
| `rules/frontend/11-data-layer.md` | Có gọi API |
| `rules/frontend/03-state.md` | Dùng Zustand store hoặc useState |
| `rules/frontend/13-error-handling.md` | Cần xử lý lỗi từ mutation/query |
| `rules/frontend/20-layout-decisions.md` | Tạo page mới hoặc đụng layout |
| `rules/frontend/14-ui-design.md` | **Luôn đọc** — typography, spacing, màu sắc, pattern chuẩn |
| `rules/shared/03-clean-code.md` | Mọi task (luôn đọc) |

Ngoài ra: chạy `ls apps/web/src/components/ui/` để lấy danh sách shadcn đã cài.

## Step 3 — Quyết định fetch strategy (BẮT BUỘC trước wireframe)

Với mỗi màn hình/section trong story, xác định rõ nguồn data và cách fetch **trước khi** vẽ wireframe. Quyết định sai ở đây dẫn đến refactor lớn sau.

### Decision tree

```
Data này có yêu cầu nào dưới đây không?
  ├─ SEO / meta tags cần data (title, description)           → Server
  ├─ Route là public (f/[formId], landing page, ...)         → Server
  ├─ Page load lần đầu: data KHÔNG thay đổi trong session    → Server
  ├─ Data cần invalidate SAU mutation (refetch sau edit)     → Client (TanStack Query)
  ├─ Data phụ thuộc user interaction (filter, sort, page)    → Client (TanStack Query)
  └─ Data dùng cả server (initial load) + client (refetch)   → Hybrid
```

### Mapping sang code

| Strategy | File | Dùng trong |
|---|---|---|
| **Server** | `src/lib/data/*.ts` | Server Component, `generateMetadata` |
| **Client** | `src/lib/api/*.ts` + custom hook | `queryFn`/`mutationFn` trong TanStack Query |
| **Hybrid** | Cả hai | Server fetch initial data → pass làm `initialData` cho `useQuery` |

### Ví dụ thực tế

| Màn hình | Strategy | Lý do |
|---|---|---|
| `f/[formId]` — public form | Server | SEO cần title/desc, không cần realtime |
| `/forms/[id]/builder` — builder | Hybrid | Initial form schema từ server → client auto-save |
| `/forms` — dashboard | Client | Cần refetch sau khi tạo/xóa form |
| `/forms/[id]/analytics` — analytics | Client | Data stale, dùng TanStack Query cache |
| `generateMetadata` | Server | Meta tags phải resolve trên server |

### Output của Step này

Ghi vào plan (Step 4) dưới dạng bảng:

```
| Data | Strategy | Lý do 1 câu |
|---|---|---|
| Form list | Client | Cần invalidate sau create/delete |
| Form detail | Hybrid | SEO title + client auto-save |
```

Nếu strategy là **Hybrid**: ghi rõ hàm nào ở `lib/data/` và hàm nào ở `lib/api/`.

---

## Step 4 — Thiết kế wireframe (dùng logic /design-ui)

Trước khi viết plan, output wireframe theo format chuẩn của `/design-ui`:

```
## Wireframe: [Tên trang/feature]
Route: [path]  |  Route group: [(name)]  |  Layout: [pattern từ rule 20]

┌─────────────────────────────────────────────────────────────┐
│  [ASCII wireframe — dùng ký tự box drawing: ┌─┐│└┘├┤┬┴┼]  │
│  Ghi rõ từng vùng: HEADER / SIDEBAR / CONTENT              │
│  Trong mỗi vùng: mô tả element + shadcn component tương ứng│
└─────────────────────────────────────────────────────────────┘

### Shadcn components cần dùng
| Component | Shadcn | Cần cài chưa? |
|---|---|---|
| ... | `<Button>` | ✅ đã có |
| ... | `<Card>` | ⚠️ chưa cài — npx shadcn add card |

### Interactions
- [Các interaction chính: click, hover, loading, empty state]
```

**Ràng buộc wireframe:**
- Layout theo route group từ rule 20 — không bịa pattern mới
- Spacing: `p-6` dashboard, `gap-4` grid, `space-y-4` fields
- Typography: `text-2xl font-bold` h1, `text-sm text-gray-500` description
- Màu semantic: `text-blue-600` link, `text-red-600` error
- Chỉ dùng `lucide-react` icon

## Step 5 — Tạo implementation plan

Dựa trên wireframe ở Step 4 và fetch strategy ở Step 3, tạo plan theo format chuẩn — in ra chat:

```
## Plan: {US-id} — {Tên ngắn}

### Files to create
- `apps/web/src/components/[feature]/[Name].tsx` — [Atom/Molecule/Organism — mô tả]
- `apps/web/src/components/[feature]/containers/[Name]Container.tsx` — [nếu cần]
- `apps/web/src/hooks/[entity]/use[Name].ts` — [useQuery/useMutation hook]

### Files to modify
- `apps/web/src/app/(route)/page.tsx` — [import component, wire props]
- `apps/web/src/store/builder.store.ts` — [action cần thêm nếu có]

### Components
| Component | Loại | Nhận props | Có side effect? |
|---|---|---|---|
| FormCard | Organism/Presenter | form, onDelete | Không |
| FormListContainer | Container | — | useFormList, useDeleteForm |

### Fetch strategy (từ Step 3)
| Data | Strategy | File |
|---|---|---|
| Form list | Client | `lib/api/forms.ts` → `useFormList` |
| Form detail | Hybrid | `lib/data/forms.ts` (server) + `lib/api/forms.ts` (client) |

### Hooks to create/reuse
- `useFormList()` — đã có tại `hooks/forms/useFormList.ts` ← reuse
- `useDeleteForm()` — đã có tại `hooks/forms/useDeleteForm.ts` ← reuse

### API endpoints cần (phải xong trước)
- `GET /api/forms` — list forms (US-{id}a phải xong trước)

### shadcn cần cài thêm
- `npx shadcn add card badge` — [từ wireframe Step 3]

### Checklist
- [ ] Fetch strategy đã được quyết định: Server / Client / Hybrid cho từng data (Step 3)
- [ ] Server fetch → hàm trong `lib/data/`, Client fetch → hàm trong `lib/api/` (rule 11)
- [ ] Hybrid: server fetcher dùng `React.cache()`, client hook nhận `initialData` nếu cần (rule 10, 11)
- [ ] Component có side effect → tách Container/Presenter (rule 08)
- [ ] Component mới đặt đúng thư mục (rule 09)
- [ ] useQuery/useMutation nằm trong custom hook (rule 04)
- [ ] Không gọi fetch() trực tiếp trong component (rule 11)
- [ ] Không có `any`, không có `console.log`
- [ ] Boolean variable có prefix is/has/can/should
- [ ] shadcn trigger dùng `asChild` + `<Button>` child, **không** dùng raw `<button>` bên trong trigger (rule 06 §8)
- [ ] List items trong Builder: `memo` + nhận `(stepId, fieldId)` + đọc store trực tiếp — **không nhận callbacks từ `.map()`** (rule 07 §4, rule 17 §5c)
- [ ] List items ngoài Builder (FormCard, ResponseRow…): bọc `memo`, callbacks từ parent phải stable (rule 17 §1)
- [ ] shadcn components thiếu đã được liệt kê để thêm qua `npx shadcn@latest add`
```

## Step 6 — Approval gate (BẮT BUỘC)

Sau khi in wireframe + plan, dùng `AskUserQuestion`:

```
AskUserQuestion({
  questions: [{
    question: "Wireframe và plan trên có ổn không?",
    header: "Approve",
    options: [
      { label: "Approve — implement ngay",  description: "Bắt đầu viết code theo plan" },
      { label: "Revise wireframe",          description: "Điều chỉnh thiết kế UI trước" },
      { label: "Revise plan",               description: "Giữ wireframe, điều chỉnh implementation plan" },
    ],
    multiSelect: false
  }]
})
```

- **Approve** → chuyển sang Step 7
- **Revise wireframe** → cập nhật wireframe, cập nhật plan theo, hỏi lại
- **Revise plan** → giữ nguyên wireframe, cập nhật plan, hỏi lại

## Step 7 — Implement

Thực hiện đúng theo plan đã approve:
1. Cài shadcn components còn thiếu (`npx shadcn add ...`) nếu có
2. Tạo/sửa files theo thứ tự: shared types → hooks → presenter → container → page
3. Chạy `git add` và `git commit` theo convention: `feat(web): ...` hoặc `feat(fe): ...`
4. Báo cáo ngắn: file đã tạo/sửa + commit hash
