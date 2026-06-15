# FlowForm — API (Backend)

## BẮT BUỘC ĐỌC TRƯỚC

1. [`../../project_overview.md`](../../project_overview.md) — Tổng quan sản phẩm
2. [`../../CLAUDE.md`](../../CLAUDE.md) — Technical stack toàn dự án

---

## STACK BACKEND

| | Thư viện | Dùng cho |
|---|---|---|
| Framework | NestJS 11 | Module + DI, REST API |
| Database | PostgreSQL (JSONB) | Lưu form schema dynamic + responses |
| ORM | Prisma 6 | Type-safe DB access, migrations |
| Auth | Better Auth | Email/password, session DB |
| Jobs | pg-boss | Async jobs trên PostgreSQL (export CSV) |
| Storage | Cloudflare R2 (AWS SDK) | File đính kèm trong form |

---

## CẤU TRÚC MODULE

```
src/
├── main.ts                   ← Bootstrap, Better Auth middleware
├── app.module.ts             ← Root module, import tất cả
├── prisma/
│   ├── prisma.module.ts      ← @Global() — inject PrismaService mọi nơi
│   └── prisma.service.ts     ← extends PrismaClient
└── modules/
    ├── auth/
    │   ├── auth.config.ts    ← betterAuth() config
    │   └── auth.module.ts
    ├── forms/                ← CRUD form schema
    ├── responses/            ← Submit + draft + list responses
    ├── analytics/            ← Track events + funnel query
    ├── storage/              ← Presigned URL cho R2 upload
    └── jobs/                 ← pg-boss job queue
```

---

## QUY TẮC QUAN TRỌNG

### Auth
- Better Auth được mount ở `main.ts` như raw middleware: `/api/auth/*`
- **Không** tạo NestJS controller cho auth routes
- Để bảo vệ route: tạo `AuthGuard` dùng `auth.api.getSession()`

### Prisma
- `PrismaModule` là `@Global()` — inject `PrismaService` trực tiếp trong bất kỳ service nào mà không cần import module
- Không khởi tạo `PrismaClient` mới trong module — chỉ dùng `PrismaService`
- Ngoại lệ: `auth.config.ts` dùng instance riêng (Better Auth yêu cầu)

### Form schema
- `schema`, `settings`, `theme` trong bảng `Form` là `Json` (JSONB)
- Validate bằng `@flowform/validators` (Zod) trước khi lưu
- Dùng `$queryRaw` khi cần query phức tạp bên trong JSONB

### Jobs (pg-boss)
- Đăng ký handler trong `JobsService.onModuleInit()`
- Gửi job qua `JobsService.enqueueExportCsv(formId)`
- pg-boss tự tạo bảng `pgboss.*` trong cùng PostgreSQL database

### Storage (R2)
- Không upload file qua NestJS server — dùng **presigned URL**
- Flow: client request URL → R2 upload trực tiếp → client gửi public URL về API

---

## LỆNH THƯỜNG DÙNG

```bash
# Chạy dev (từ root)
npm run dev

# Chạy riêng api
cd apps/api && npm run dev

# Prisma
cd apps/api && npm run db:generate    # generate client sau khi sửa schema
cd apps/api && npm run db:migrate     # tạo migration mới
cd apps/api && npm run db:push        # push thẳng lên DB (dev nhanh)
cd apps/api && npm run db:studio      # mở Prisma Studio

# Build
cd apps/api && npm run build
```

---

## RULES

- [`01 — Module Structure & File Naming`](../../rules/api/01-module-structure.md) — Cấu trúc thư mục module, đặt tên file kebab-case, phân tách Controller/Service/Repository, CQRS light pattern
- [`02 — DTO Validation Strategy`](../../rules/api/02-dto-validation.md) — Dùng Zod từ `@flowform/validators`, ZodValidationPipe custom, validate JSONB cả read và write, response DTO mapping
- [`03 — Error Handling & HTTP Exception Format`](../../rules/api/03-error-handling.md) — RFC 7807 Problem Details, global HttpExceptionFilter, NestJS exception classes, Prisma P-code handling, Logger
- [`04 — Repository/Service Layering Pattern`](../../rules/api/04-service-layering.md) — 3-tầng Controller→Service→Repository, CQRS light trong Service, response format flat vs envelope, DI rules
- [`05 — Auth Guard & Ownership Check Pattern`](../../rules/api/05-auth-guard.md) — AuthGuard (Better Auth session), FormOwnerGuard (DB ownership check), @CurrentUser() decorator, guard ordering, rate limiting
- [`06 — Prisma Patterns`](../../rules/api/06-prisma-patterns.md) — PrismaService DI only, select vs include, JSONB hydration với Zod, transactions, raw queries an toàn với Prisma.sql
- [`07 — pg-boss Job Patterns`](../../rules/api/07-pgboss-job-patterns.md) — Async jobs qua pg-boss, job name constants, register trong onModuleInit, payload validation, idempotent handlers
- [`08 — Storage & R2 Upload Patterns`](../../rules/api/08-storage-r2-patterns.md) — Presigned URL flow 3 bước, 10MB limit, 15min expiry, MIME allowlist, DB record chỉ tạo sau confirm
- [`09 — Config & Environment Variable Patterns`](../../rules/api/09-config-env-patterns.md) — ConfigService thay vì process.env, Zod env schema validate lúc startup, getOrThrow cho required vars

---

## API ENDPOINTS

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/auth/*` | Better Auth (handled by middleware) |
| `GET` | `/api/forms` | Danh sách form của user |
| `POST` | `/api/forms` | Tạo form mới |
| `GET` | `/api/forms/:id` | Chi tiết form (public — không cần auth) |
| `PATCH` | `/api/forms/:id` | Cập nhật form schema |
| `PATCH` | `/api/forms/:id/publish` | Xuất bản form |
| `DELETE` | `/api/forms/:id` | Xóa form |
| `POST` | `/api/forms/:id/responses` | End-user submit response |
| `POST` | `/api/forms/:id/responses/draft` | End-user lưu nháp |
| `GET` | `/api/forms/:id/responses` | Form owner xem responses |
| `POST` | `/api/forms/:id/analytics/events` | Track step event |
| `GET` | `/api/forms/:id/analytics/funnel` | Funnel data |
| `GET` | `/api/forms/:id/analytics/summary` | Tổng hợp stats |
