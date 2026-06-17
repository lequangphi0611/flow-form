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
| [`../../rules/frontend/01-conventions.md`](../../rules/frontend/01-conventions.md) | **Tạo file mới bất kỳ** — đặt tên file, tổ chức imports. Nhớ: component file = PascalCase (`RegisterForm.tsx`), hook/util/store = camelCase (`useAutoSave.ts`) |
| [`../../rules/frontend/02-components.md`](../../rules/frontend/02-components.md) | Viết component: props interface, ref forwarding, composition, displayName — **sau khi** đã quyết định vị trí file (rule 09) và phân tách container/presenter (rule 08) |
| [`../../rules/frontend/03-state.md`](../../rules/frontend/03-state.md) | Thêm `useState`, `useReducer`, hoặc bất kỳ Zustand action nào vào component |
| [`../../rules/frontend/04-data-fetching.md`](../../rules/frontend/04-data-fetching.md) | TanStack Query client hooks: useQuery, useMutation, query keys, optimistic update |
| [`../../rules/frontend/05-forms.md`](../../rules/frontend/05-forms.md) | **Tạo bất kỳ form nào** — auth (login/register), dashboard settings, builder settings, wizard renderer — bất kỳ `<form>` element nào |
| [`../../rules/frontend/06-styling.md`](../../rules/frontend/06-styling.md) | Styling với Tailwind + shadcn/ui |
| [`../../rules/frontend/07-builder.md`](../../rules/frontend/07-builder.md) | Làm việc trong module Builder (dnd-kit, canvas, store) |
| [`../../rules/frontend/08-presenter-container.md`](../../rules/frontend/08-presenter-container.md) | **Tạo component có useQuery, useMutation, useSession, useBuilderStore, signIn, signUp, signOut, hoặc router.push** — phải tách Container riêng trước khi viết JSX |
| [`../../rules/frontend/09-atomic-design.md`](../../rules/frontend/09-atomic-design.md) | **Tạo component mới bất kỳ** — quyết định đặt file ở đâu trong `components/` |
| [`../../rules/frontend/10-nextjs-cache.md`](../../rules/frontend/10-nextjs-cache.md) | Thêm `fetch()` vào Server Component, hoặc dùng `revalidatePath`/`revalidateTag`, hoặc bọc component bằng `<Suspense>` |
| [`../../rules/frontend/11-data-layer.md`](../../rules/frontend/11-data-layer.md) | **Bất cứ khi nào cần gọi API hoặc fetch DB** — luôn phải tạo hàm trong `lib/data/` (server) hoặc `lib/api/` (client), không gọi `fetch()` trực tiếp trong component |
| [`../../rules/frontend/12-route-handlers.md`](../../rules/frontend/12-route-handlers.md) | Next.js Route Handlers: khi nào dùng, cách viết, cách gọi |
| [`../../rules/frontend/13-error-handling.md`](../../rules/frontend/13-error-handling.md) | Xử lý lỗi từ `useMutation`/`useQuery`, tạo `error.tsx`/`not-found.tsx`, hiển thị toast, Server Action thất bại |
| [`../../rules/frontend/14-ui-design.md`](../../rules/frontend/14-ui-design.md) | Typography, spacing, màu sắc, layout patterns, loading, empty state |
| [`../../rules/frontend/15-auth.md`](../../rules/frontend/15-auth.md) | **Implement bất kỳ tính năng auth nào** — trang login/register, bảo vệ route, đọc session trong Server Component, dùng `useSession()` trong Client Component. Auth pages có `signIn`/`signUp` + `router.push` → **phải đọc rule 08 trước** |
| [`../../rules/frontend/16-typescript.md`](../../rules/frontend/16-typescript.md) | `as`, `any`, `unknown`, `@ts-expect-error`, non-null assertion, generics |
| [`../../rules/frontend/17-performance.md`](../../rules/frontend/17-performance.md) | Render danh sách (list/grid), import thư viện nặng (charts, rich text, PDF), component re-render nhiều lần |
| [`../../rules/frontend/18-form-engine.md`](../../rules/frontend/18-form-engine.md) | Conditional fields, dynamic Zod schema, useFormTracking, file upload cho end-user |
| [`../../rules/frontend/19-url-state.md`](../../rules/frontend/19-url-state.md) | Search params cho filter/sort/pagination — không dùng useState hay Zustand |
| [`../../rules/frontend/20-layout-decisions.md`](../../rules/frontend/20-layout-decisions.md) | **Tạo/sửa `layout.tsx`**, tạo `page.tsx` mới, thêm route group, hoặc task đề cập "header", "sidebar", "layout", "trang mới". Tra cứu decision log trước khi code. **Bắt buộc ghi lại quyết định mới** sau khi implement. |
| [`../../rules/shared/03-clean-code.md`](../../rules/shared/03-clean-code.md) | **Mọi PR** — function design, naming (is/has/SCREAMING_SNAKE/plural), no magic values, no dead code/any/console.log |

---

## STACK FRONTEND

| | Thư viện | Dùng cho |
|---|---|---|
| Framework | Next.js 15 (App Router) | Routing, SSR cho public form, layout |
| UI | shadcn/ui (Radix) + Tailwind CSS v4 | Components, styling — dùng `asChild` cho triggers |
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
│   ├── (auth)/               ← Route group: login, register (không cần auth)
│   ├── (dashboard)/          ← Route group: layout có sidebar
│   │   └── forms/page.tsx    ← Danh sách form
│   ├── (builder)/            ← Route group: layout full-screen
│   │   └── forms/[id]/builder/page.tsx
│   ├── (analytics)/          ← Route group: layout dashboard
│   │   └── forms/[id]/analytics/page.tsx
│   └── f/[formId]/page.tsx   ← Public form — SSR
├── components/
│   ├── ui/                   ← ATOM: shadcn/ui primitives (Button, Input, Label...)
│   ├── common/               ← MOLECULE: tổ hợp atoms dùng chung (FormField, EmptyState...)
│   ├── auth/                 ← ORGANISM: components của feature auth
│   ├── forms/                ← ORGANISM: components của feature quản lý form
│   ├── builder/              ← ORGANISM: components của feature builder
│   ├── analytics/            ← ORGANISM: components của feature analytics
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

### Tách Container / Presenter — BẮT BUỘC khi component có side effect

Trước khi viết JSX của bất kỳ component nào, kiểm tra: component này có dùng `useQuery`, `useMutation`, `useSession`, `useBuilderStore`, `signIn`, `signUp`, `signOut`, `router.push`, hay `useEffect` gọi API không?

- **Có** → phải tách thành 2 file:
  - `components/[feature]/containers/[Name]Container.tsx` — chỉ fetch/mutate/điều hướng, truyền kết quả xuống Presenter qua props
  - `components/[feature]/[Name].tsx` — chỉ nhận props và render JSX, không biết API/store tồn tại
- **Không** → đây là Presenter thuần, viết trực tiếp

**Ví dụ auth form đúng:**
```
components/auth/containers/RegisterContainer.tsx  ← gọi signUp.email(), router.push()
components/auth/RegisterForm.tsx                  ← nhận { isPending, onSubmit } qua props
```

Đọc [`rules/frontend/08-presenter-container.md`](../../rules/frontend/08-presenter-container.md) để xem ví dụ đầy đủ.

---

### Đặt component mới ở đâu — BẮT BUỘC kiểm tra trước khi tạo file

Mỗi khi tạo component mới, trả lời theo thứ tự:

1. **Có phải shadcn/ui primitive?** → `components/ui/` (Atom — do `npx shadcn add` generate hoặc tự tạo wrapper Radix)
2. **Dùng được ở nhiều feature, không fetch, không đọc store?** → `components/common/` (Molecule)
3. **Gắn với 1 feature cụ thể?** → `components/[feature]/` (Organism)
   - auth form → `components/auth/`
   - form list/card → `components/forms/`
   - drag & drop canvas → `components/builder/`
   - charts, stats → `components/analytics/`
4. **Cần fetch hoặc kết nối Zustand store?** → `components/[feature]/containers/` (Container)
5. **Là entry point của route?** → `app/**/page.tsx` (Page — không chứa logic phức tạp)

**Không bao giờ đặt component vào `app/**/[route]/_components/`** trừ khi component đó chỉ dùng đúng 1 lần tại route đó VÀ không thể tái sử dụng. Ngay cả khi đó, ưu tiên đặt vào `components/[feature]/` trước.

Đọc [`rules/frontend/09-atomic-design.md`](../../rules/frontend/09-atomic-design.md) để biết đầy đủ ví dụ và edge cases.

---

### Naming convention — BẮT BUỘC khi tạo file mới

**Trước khi tạo bất kỳ file nào**, xác định loại file:

| Loại | Convention | Ví dụ đúng | Ví dụ sai |
|---|---|---|---|
| Component | **PascalCase** | `RegisterForm.tsx` | `register-form.tsx`, `registerForm.tsx` |
| Hook | camelCase | `useAutoSave.ts` | `UseAutoSave.ts`, `use-auto-save.ts` |
| Util / lib | camelCase | `formatDate.ts` | `FormatDate.ts` |
| Store | camelCase | `builder.store.ts` | `BuilderStore.ts` |
| Schema | camelCase | `register.schema.ts` | `RegisterSchema.ts` |

**Tên file phải khớp với tên export chính:**
```
// file: RegisterForm.tsx → export function RegisterForm()  ✅
// file: register-form.tsx → export function RegisterForm() ❌ tên không khớp
```

Đọc [`rules/frontend/01-conventions.md`](../../rules/frontend/01-conventions.md) để xem đầy đủ.

---

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
Thêm component mới:
```bash
npx shadcn@latest add button input dialog
```
Nếu không có network, tạo thủ công: wrap `@radix-ui/react-<name>` theo pattern của `button.tsx`/`dropdown-menu.tsx` — dùng `asChild`, không dùng `render` prop.

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
