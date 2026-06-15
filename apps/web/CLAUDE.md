# FlowForm — Web (Frontend)

## BẮT BUỘC ĐỌC TRƯỚC

1. [`../../project_overview.md`](../../project_overview.md) — Tổng quan sản phẩm
2. [`../../CLAUDE.md`](../../CLAUDE.md) — Technical stack toàn dự án
3. Rules bên dưới — đọc file phù hợp với task đang làm

---

## CODING RULES

> Đọc file tương ứng với phần đang làm. Không cần đọc tất cả cùng lúc.

| File | Đọc khi |
|---|---|
| [`../../rules/frontend/01-conventions.md`](../../rules/frontend/01-conventions.md) | Tạo file mới, đặt tên, tổ chức imports |
| [`../../rules/frontend/02-components.md`](../../rules/frontend/02-components.md) | Viết React component bất kỳ |
| [`../../rules/frontend/03-state.md`](../../rules/frontend/03-state.md) | Làm việc với Zustand store hoặc local state |
| [`../../rules/frontend/04-data-fetching.md`](../../rules/frontend/04-data-fetching.md) | TanStack Query client hooks: useQuery, useMutation, query keys, optimistic update |
| [`../../rules/frontend/05-forms.md`](../../rules/frontend/05-forms.md) | Form bất kỳ — builder settings hoặc wizard renderer |
| [`../../rules/frontend/06-styling.md`](../../rules/frontend/06-styling.md) | Styling với Tailwind + shadcn/ui |
| [`../../rules/frontend/07-builder.md`](../../rules/frontend/07-builder.md) | Làm việc trong module Builder (dnd-kit, canvas, store) |
| [`../../rules/frontend/08-presenter-container.md`](../../rules/frontend/08-presenter-container.md) | Tách Container (fetch/store) và Presenter (render UI) |
| [`../../rules/frontend/09-atomic-design.md`](../../rules/frontend/09-atomic-design.md) | Phân loại component: Atom / Molecule / Organism / Page |
| [`../../rules/frontend/10-nextjs-cache.md`](../../rules/frontend/10-nextjs-cache.md) | Caching Server Components: fetch options, React.cache, revalidate, Suspense |
| [`../../rules/frontend/11-data-layer.md`](../../rules/frontend/11-data-layer.md) | Không gọi fetch trực tiếp — luôn qua `lib/data/` (server) hoặc `lib/api/` (client) |
| [`../../rules/frontend/12-route-handlers.md`](../../rules/frontend/12-route-handlers.md) | Next.js Route Handlers: khi nào dùng, cách viết, cách gọi |
| [`../../rules/frontend/13-error-handling.md`](../../rules/frontend/13-error-handling.md) | error.tsx, not-found, TanStack Query errors, toast, Server Action |
| [`../../rules/frontend/14-ui-design.md`](../../rules/frontend/14-ui-design.md) | Typography, spacing, màu sắc, layout patterns, loading, empty state |
| [`../../rules/frontend/15-auth.md`](../../rules/frontend/15-auth.md) | Middleware bảo vệ route, getSession() trong Server Component, useSession() trong Client |
| [`../../rules/frontend/16-typescript.md`](../../rules/frontend/16-typescript.md) | `as`, `any`, `unknown`, `@ts-expect-error`, non-null assertion, generics |
| [`../../rules/frontend/17-performance.md`](../../rules/frontend/17-performance.md) | React.memo cho list items, useMemo, useCallback, next/dynamic cho thư viện nặng |
| [`../../rules/frontend/18-form-engine.md`](../../rules/frontend/18-form-engine.md) | Conditional fields, dynamic Zod schema, useFormTracking, file upload cho end-user |
| [`../../rules/frontend/19-url-state.md`](../../rules/frontend/19-url-state.md) | Search params cho filter/sort/pagination — không dùng useState hay Zustand |

---

## STACK FRONTEND

| | Thư viện | Dùng cho |
|---|---|---|
| Framework | Next.js 15 (App Router) | Routing, SSR cho public form, layout |
| UI | shadcn/ui + Tailwind CSS v4 | Components, styling |
| State | Zustand + Immer | Builder state (steps, fields, logic) |
| DnD | dnd-kit | Drag & drop trong Builder |
| Form | React Hook Form + Zod | Wizard renderer — validate từng step |
| Data | TanStack Query | Fetch + cache API data |
| Charts | Recharts | Funnel analytics |
| Auth | better-auth/react | `useSession`, `signIn`, `signOut` |

---

## CẤU TRÚC THƯ MỤC

```
src/
├── app/
│   ├── (dashboard)/          ← Route group: layout có sidebar
│   │   └── forms/page.tsx    ← Danh sách form
│   ├── (builder)/            ← Route group: layout full-screen
│   │   └── forms/[id]/builder/page.tsx
│   ├── (analytics)/          ← Route group: layout dashboard
│   │   └── forms/[id]/analytics/page.tsx
│   └── f/[formId]/page.tsx   ← Public form — SSR
├── components/
│   └── providers.tsx         ← QueryClientProvider
├── lib/
│   ├── utils.ts              ← cn() helper
│   ├── query-client.ts
│   └── auth-client.ts        ← better-auth client
└── store/
    └── builder.store.ts      ← Zustand store cho Builder
```

---

## QUY TẮC QUAN TRỌNG

### Route groups
- `(dashboard)` — Các trang cần đăng nhập, có sidebar
- `(builder)` — Layout full-screen, không có sidebar (không gian tối đa cho builder)
- `(analytics)` — Layout dashboard với charts
- `f/[formId]` — **Public**, không cần auth, SSR để SEO và load nhanh

### Builder store
- Toàn bộ state của builder nằm trong `src/store/builder.store.ts`
- Dùng Immer để mutate nested object an toàn
- Không dùng `useState` cho form schema trong builder — luôn dùng store

### Data fetching
- Server Components: fetch trực tiếp (không qua TanStack Query)
- Client Components: dùng TanStack Query hooks
- Public form page (`f/[formId]`): fetch ở Server Component, pass xuống client

### shadcn/ui setup
Chạy lần đầu để khởi tạo shadcn:
```bash
npx shadcn@latest init
```
Thêm component:
```bash
npx shadcn@latest add button input dialog
```

### Thêm thư viện mới
Chỉ thêm vào `apps/web/package.json`, không phải root.

---

## LỆNH THƯỜNG DÙNG

```bash
# Chạy dev (từ root)
npm run dev

# Chạy riêng web
cd apps/web && npm run dev

# Build
cd apps/web && npm run build
```
