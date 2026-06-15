# FlowForm

> Dynamic Form Builder SaaS — tạo form multi-step wizard trực quan, tích hợp logic điều kiện, và phân tích drop-off theo từng bước.

## Tính năng

- **Builder** — kéo thả để tạo form nhiều bước, thêm logic "nếu–thì" trực quan
- **Engine** — wizard renderer với validation từng bước, lưu tạm & tiếp tục, nhúng vào website
- **Analytics** — funnel view, field insights, export CSV, biết chính xác người dùng bỏ ở bước nào

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 (App Router) + shadcn/ui + Zustand + TanStack Query |
| Backend | NestJS + Prisma + PostgreSQL (JSONB) + Better Auth + pg-boss |
| Embed widget | Vite + Preact (~30KB gzipped) |
| File storage | Cloudflare R2 |
| Hosting | Vercel (web) · Render (api) · Neon (database) |

## Cấu trúc monorepo

```
flowform/
├── apps/
│   ├── web/        ← Next.js dashboard, builder, analytics, public form
│   ├── api/        ← NestJS REST API
│   └── embed/      ← Vite + Preact widget nhúng vào website khách
├── packages/
│   ├── types/      ← Shared TypeScript types
│   └── validators/ ← Shared Zod schemas
└── rules/          ← Coding rules theo layer (frontend, api, embed, shared)
```

## Bắt đầu

### Yêu cầu

- Node.js 20+
- npm 10+
- PostgreSQL (hoặc Neon connection string)

### Cài đặt

```bash
npm install
```

### Cấu hình môi trường

```bash
cp .env.example .env
# Điền DATABASE_URL, BETTER_AUTH_SECRET, và các biến R2
```

Xem thêm `apps/api/.env.example` cho biến môi trường riêng của backend.

### Chạy development

```bash
# Chạy tất cả apps cùng lúc
npm run dev

# web:   http://localhost:3000
# api:   http://localhost:3001
# embed: http://localhost:5173
```

### Database

```bash
# Generate Prisma client
npm run db:generate

# Chạy migration
npm run db:migrate
```

### Build

```bash
npm run build
```

## Tài liệu

- [`project_overview.md`](./project_overview.md) — Tầm nhìn sản phẩm, tính năng, gói dịch vụ, lộ trình
- [`CLAUDE.md`](./CLAUDE.md) — Hướng dẫn cho AI assistant, kiến trúc, coding rules
- [`apps/web/CLAUDE.md`](./apps/web/CLAUDE.md) — Rules cho Frontend
- [`apps/api/CLAUDE.md`](./apps/api/CLAUDE.md) — Rules cho Backend
- [`apps/embed/CLAUDE.md`](./apps/embed/CLAUDE.md) — Rules cho Embed widget
