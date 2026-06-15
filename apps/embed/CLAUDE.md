# FlowForm -- Embed Widget

## BẮT BUỘC ĐỌC TRƯỚC

1. [`../../project_overview.md`](../../project_overview.md) -- Tổng quan sản phẩm
2. [`../../CLAUDE.md`](../../CLAUDE.md) -- Technical stack toàn dự án
3. Rules bên dưới -- đọc file tương ứng với task đang làm

---

## MỤC ĐÍCH

Embed widget là một `<script>` tag nhỏ mà form owner nhúng vào website của họ. Widget render form trực tiếp trong trang web của khách hàng, không cần redirect sang flowform.dev.

Đây là layer **khác biệt nhất** trong monorepo -- nó chạy trong môi trường hoàn toàn ngoài tầm kiểm soát của chúng ta (host page của website khách).

---

## TECH STACK

| | Thư viện | Lý do |
|---|---|---|
| Framework | Preact 10 | API giống React nhưng chỉ ~3KB gzip |
| Build tool | Vite | Tree-shaking mạnh, bundle ES module |
| State | useState/useReducer từ preact/hooks | Không cần thư viện ngoài |
| Fetch | Native browser fetch API | Không cần axios hay TanStack Query |
| CSS | CSS modules hoặc inline styles | Tailwind bị cấm trong embed |
| Types | @flowform/types | Shared với api và web |

---

## BUNDLE TARGET

**Hard limit: 30KB gzipped cho toàn bộ bundle (JS + CSS + assets)**

Mọi dependency mới phải được kiểm tra trên bundlephobia.com trước khi thêm vào.

---

## NHỮNG GÌ KHÔNG ĐƯỢC PHÉP

| Bị cấm | Thay thế |
|---|---|
| `react`, `react-dom` | `preact`, `preact/hooks` |
| `zustand`, `jotai` | `useState`, `useReducer` |
| `@tanstack/react-query` | Native `fetch` + custom `useFetch` hook |
| `shadcn/ui`, `radix-ui` | Plain HTML + scoped CSS |
| `tailwindcss` | CSS modules hoặc inline styles |
| `axios`, `ky` | Native `fetch` |
| `lodash`, `ramda` | Inline utility functions |
| CSS global resets | Styles phải scoped trong shadow DOM hoặc `.flowform-` prefix |
| Bare element selectors ngoài shadow DOM | BEM với prefix `flowform-` |

---

## CẤU TRÚC FILE

```
apps/embed/
├── src/
│   ├── main.tsx           -- Entry point: auto-init + window.FlowForm API
│   ├── App.tsx            -- Root component, fetch form, render wizard
│   ├── hooks/
│   │   └── use-fetch.ts   -- Shared data fetching hook
│   └── widget.css         -- Scoped styles (shadow DOM hoặc .flowform- prefix)
├── vite.config.ts         -- Build config, output: dist/embed.js
└── package.json
```

---

## PUBLIC API (KHÔNG ĐƯỢC BREAKING CHANGE)

Website owner nhúng widget bằng 2 cách:

**Cách 1 -- Declarative (HTML attribute):**
```html
<div
  data-flowform
  data-flowform-id="abc123"
  data-flowform-api="https://api.flowform.dev"
></div>
<script src="https://cdn.flowform.dev/embed.js"></script>
```

**Cách 2 -- Programmatic (JavaScript):**
```html
<div id="my-form"></div>
<script src="https://cdn.flowform.dev/embed.js"></script>
<script>
  FlowForm.init({
    formId: 'abc123',
    target: '#my-form',
    apiUrl: 'https://api.flowform.dev'
  })
</script>
```

`window.FlowForm` luôn phải expose: `init(options)` và `version`.

---

## RULES

| File | Đọc khi |
|---|---|
| [`../../rules/embed/01-bundle-constraints.md`](../../rules/embed/01-bundle-constraints.md) | Thêm dependency mới, kiểm tra bundle size, chọn thư viện |
| [`../../rules/embed/02-css-isolation.md`](../../rules/embed/02-css-isolation.md) | Viết CSS bất kỳ, đặt tên class, shadow DOM setup |
| [`../../rules/embed/03-preact-conventions.md`](../../rules/embed/03-preact-conventions.md) | Viết component, import hooks, data fetching |
| [`../../rules/embed/04-public-api-contract.md`](../../rules/embed/04-public-api-contract.md) | Thay đổi `window.FlowForm`, `data-flowform` attributes, hoặc InitOptions |

---

## LỆNH THƯỜNG DÙNG

```bash
# Chạy dev
cd apps/embed && npm run dev

# Build production bundle
cd apps/embed && npm run build

# Kiểm tra bundle size sau build
cd apps/embed && npm run build
# Xem output size trong terminal -- cột "gzip" là số quan trọng

# Preview build output
cd apps/embed && npm run preview
```

---

## QUY TẮC QUAN TRỌNG

### CSS isolation (bắt buộc)

Widget chạy trong host page của website khách. CSS không được leak ra ngoài widget hoặc bị override bởi host page.

- **Preferred**: Shadow DOM (`el.attachShadow({ mode: 'open' })`)
- **Alternative**: Tất cả class name phải có prefix `flowform-` + BEM convention

### API compatibility

`window.FlowForm.init()` và `[data-flowform]` là public contract với mọi website đã nhúng widget. Không được đổi tên, không được thêm required option, không được xóa behavior -- nếu cần breaking change thì phải bump major version.

### Preact, không phải React

Mọi import component phải từ `preact` hoặc `preact/hooks`. Import từ `react` hoặc `react-dom` sẽ làm vỡ bundle size.

### Không có thư viện state ngoài

`useState` và `useReducer` từ `preact/hooks` là đủ cho scale hiện tại của embed widget. Không cần Zustand.
