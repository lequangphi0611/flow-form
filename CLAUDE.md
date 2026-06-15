# FlowForm — CLAUDE.md

## BẮT BUỘC ĐỌC TRƯỚC

Trước khi thực hiện bất kỳ tác vụ nào, đọc file sau:

- [`project_overview.md`](./project_overview.md) — Tầm nhìn sản phẩm, tính năng cốt lõi, hành trình người dùng, gói dịch vụ, lộ trình phát triển

Nếu làm việc trong một app hoặc package cụ thể, đọc thêm CLAUDE.md của app/package đó:

- [`apps/web/CLAUDE.md`](./apps/web/CLAUDE.md) — Quy tắc và cấu trúc Frontend (Next.js)
- [`apps/api/CLAUDE.md`](./apps/api/CLAUDE.md) — Quy tắc và cấu trúc Backend (NestJS)
- [`apps/embed/CLAUDE.md`](./apps/embed/CLAUDE.md) — Quy tắc Embed Widget (Vite + Preact, bundle constraints)
- [`packages/types/CLAUDE.md`](./packages/types/CLAUDE.md) — Khi nào type vào shared package
- [`packages/validators/CLAUDE.md`](./packages/validators/CLAUDE.md) — Khi nào Zod schema vào shared package

---

## TECHNICAL STACK

### Frontend

| Layer | Lựa chọn | Lý do |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR cho trang public form, layout lồng nhau cho dashboard |
| Embed Widget | Vite + Preact | Bundle nhỏ (~30KB) cho script nhúng vào website khách |
| UI Components | shadcn/ui + Tailwind CSS | Headless, tùy chỉnh 100%, không ép design opinion |
| State Management | Zustand + Immer | Quản lý form builder state (steps, fields, logic rules) — nested object |
| Drag & Drop | dnd-kit | Đang active maintain, headless, accessible |
| Form Rendering | React Hook Form + Zod | Uncontrolled (ít re-render), TypeScript-first schema validation |
| Data Fetching | TanStack Query | Cache tinh vi, invalidation sau mutation, background refetch |
| Charts | Recharts | React-native, có FunnelChart sẵn cho analytics |

### Backend

| Layer | Lựa chọn | Lý do |
|---|---|---|
| Framework | NestJS | Module + DI pattern, scale tốt, TypeScript first-class |
| Database | PostgreSQL (JSONB) | Lưu form schema dynamic + query analytics phức tạp |
| ORM | Prisma | Type-safe, DX tốt, Prisma Studio debug data |
| Auth | Better Auth | Framework-agnostic, database sessions (không cần Redis) |
| Background Jobs | pg-boss | Job queue trên PostgreSQL sẵn có, không cần Redis |
| File Storage | Cloudflare R2 | Free egress, S3-compatible API |

### Infrastructure (Free tier)

| Service | Provider | Giới hạn free |
|---|---|---|
| Frontend hosting | Vercel Hobby | 100 GB bandwidth/tháng |
| Backend hosting | Render Free | 750 giờ/tháng, cold start ~30–50s sau idle |
| Database | Neon | 0.5 GB storage, auto-pause sau 5 phút idle |
| File storage | Cloudflare R2 | 10 GB storage, egress miễn phí |
| Keep-alive | UptimeRobot | Ping Render mỗi 10 phút để tránh cold start |

### Monorepo

```
flowform/
├── apps/
│   ├── web/          ← Next.js (dashboard, builder, analytics, public form)
│   ├── api/          ← NestJS (REST API)
│   └── embed/        ← Vite + Preact (widget nhúng vào website khách)
├── packages/
│   ├── types/        ← Shared TypeScript types (FormSchema, Response...)
│   └── validators/   ← Zod schemas dùng chung frontend + backend
└── turbo.json        ← Turborepo
```

---

## KIẾN TRÚC 3 MODULE CHÍNH

### Builder
- Drag & drop sắp xếp steps và fields (dnd-kit)
- State phức tạp nhất — dùng Zustand store riêng
- Logic builder (if/then rules) lưu dạng JSONB trong PostgreSQL

### Engine (Wizard Renderer)
- Public form — SSR với Next.js
- Validate từng step trước khi next (React Hook Form + Zod)
- Auto-save nháp (debounced API call, không cần WebSocket)
- Embed widget build riêng bằng Vite + Preact

### Analytics
- Funnel view — Recharts FunnelChart
- Dữ liệu từ bảng `form_analytics_events` trong PostgreSQL
- Export CSV xử lý async qua pg-boss job

---

## NHỮNG GÌ KHÔNG CÓ TRONG PROJECT NÀY

- **Redis** — loại bỏ hoàn toàn; session lưu DB, rate limit in-memory, jobs dùng pg-boss
- **Email** — không có tính năng gửi email
- **BullMQ** — thay bằng pg-boss

---

## CODING RULES

Toàn bộ coding rules được tổ chức theo layer trong thư mục `rules/`:

### Frontend rules — `rules/frontend/` (19 rules)
Đọc `apps/web/CLAUDE.md` để xem danh sách đầy đủ và khi nào đọc rule nào.

### Backend rules — `rules/api/` (9 rules)
Đọc `apps/api/CLAUDE.md` để xem danh sách đầy đủ và khi nào đọc rule nào.

### Embed rules — `rules/embed/` (4 rules)
Đọc `apps/embed/CLAUDE.md` để xem danh sách đầy đủ và khi nào đọc rule nào.

| Rule | Mô tả |
|---|---|
| [`rules/embed/01-bundle-constraints.md`](./rules/embed/01-bundle-constraints.md) | Hard limit 30KB gzip, danh sách dependency bị cấm |
| [`rules/embed/02-css-isolation.md`](./rules/embed/02-css-isolation.md) | Shadow DOM hoặc flowform- prefix, không global CSS |
| [`rules/embed/03-preact-conventions.md`](./rules/embed/03-preact-conventions.md) | Import từ preact, functional only, useFetch hook |
| [`rules/embed/04-public-api-contract.md`](./rules/embed/04-public-api-contract.md) | window.FlowForm API, data-flowform attributes, backward compat |

### Shared package rules — `rules/shared/` (2 rules)

| Rule | Mô tả |
|---|---|
| [`rules/shared/01-types-package.md`](./rules/shared/01-types-package.md) | Khi nào type vào @flowform/types, chỉ type declarations |
| [`rules/shared/02-validators-package.md`](./rules/shared/02-validators-package.md) | Khi nào schema vào @flowform/validators, export type kèm schema |
