# 01 — Quy tắc đặt tên và tổ chức file

## 1. Naming convention

### Component files → PascalCase
```
src/components/builder/StepList.tsx           ✅
src/components/builder/FieldSettingsPanel.tsx  ✅
src/components/builder/stepList.tsx            ❌
src/components/builder/step-list.tsx           ❌
```

### Hooks, utils, stores → camelCase
```
src/hooks/useAutoSave.ts       ✅
src/lib/formatDate.ts          ✅
src/store/builder.store.ts     ✅
src/hooks/UseAutoSave.ts       ❌
src/store/BuilderStore.ts      ❌
```

### Tên file phải khớp với tên export chính
```tsx
// file: StepCard.tsx
export function StepCard() { ... }   // ✅ — tên file khớp export

// file: StepCard.tsx
export function StepItem() { ... }   // ❌ — tên không khớp, gây nhầm lẫn
```

---

## 2. Tổ chức file trong `src/`

### Khi nào tách file
- Component có logic riêng, dài hơn ~120 dòng → tách ra file riêng
- Hook dùng ở nhiều hơn 1 nơi → tách vào `src/hooks/`
- Hàm util thuần (không có side effect) → tách vào `src/lib/`
- Types chỉ dùng trong 1 module → đặt ngay trong file đó, **không** tách ra

### Khi nào để cùng 1 file
- Helper component nhỏ (< 30 dòng) chỉ dùng bởi component chính → để cùng file
- Constant gắn chặt với component → để cùng file

```tsx
// ✅ — FieldCard.tsx: helper component nhỏ để cùng file
function FieldIcon({ type }: { type: FieldType }) {
  // small icon mapper, only used by FieldCard
  const icons: Record<FieldType, string> = { text: '📝', email: '✉️' /* ... */ }
  return <span>{icons[type]}</span>
}

export function FieldCard({ field }: { field: FieldSchema }) {
  return (
    <div>
      <FieldIcon type={field.type} />
      {field.label}
    </div>
  )
}
```

### Cấu trúc thư mục components
```
src/components/
├── ui/               ← ATOM: shadcn/ui generated — KHÔNG EDIT trực tiếp
├── common/           ← MOLECULE: atoms kết hợp, dùng chung toàn app
│   ├── FormField.tsx
│   └── EmptyState.tsx
├── auth/             ← ORGANISM: feature auth
│   ├── containers/
│   │   └── RegisterContainer.tsx
│   └── RegisterForm.tsx
├── builder/          ← ORGANISM: feature Builder
│   ├── containers/
│   ├── StepList.tsx
│   ├── StepCard.tsx
│   ├── FieldCard.tsx
│   └── FieldSettingsPanel.tsx
├── forms/            ← ORGANISM: feature quản lý form
│   ├── containers/
│   ├── FormGrid.tsx
│   └── FormCard.tsx
├── analytics/        ← ORGANISM: feature analytics
│   ├── FunnelChart.tsx
│   └── SummaryCards.tsx
├── form-engine/      ← ORGANISM: Wizard renderer (end-user)
│   ├── WizardStep.tsx
│   └── FieldRenderer.tsx
└── providers.tsx     ← app-level providers
```

### KHÔNG đặt component trong `app/**/[route]/_components/`

```
// ❌ — KHÔNG làm
app/(auth)/register/_components/RegisterForm.tsx

// ✅ — Luôn đặt vào components/[feature]/
components/auth/RegisterForm.tsx
```

`_components/` là anti-pattern trong codebase này vì:
- Component bị giam trong 1 route, không thể tái sử dụng
- Mọi component, kể cả dùng 1 lần, đều phải qua `components/[feature]/` để dễ tìm và tái sử dụng sau
- Nếu component thực sự cần fetch hay đọc store → đặt vào `components/[feature]/containers/`

Xem `09-atomic-design.md` để biết đầy đủ quy trình phân loại.

---

## 3. Import order

Thứ tự: **external libs → internal packages → local files → types**

```tsx
// ✅ Đúng — 4 nhóm, cách nhau 1 dòng trống
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { FormSchema, FieldSchema } from '@flowform/types'
import { fieldSchemaValidator } from '@flowform/validators'

import { useBuilderStore } from '@/store/builder.store'
import { cn } from '@/lib/utils'

import { StepCard } from './StepCard'
import type { StepCardProps } from './StepCard'
```

```tsx
// ❌ Sai — trộn lẫn, không có thứ tự
import { StepCard } from './StepCard'
import { useState } from 'react'
import type { FormSchema } from '@flowform/types'
import { useBuilderStore } from '@/store/builder.store'
import { useQuery } from '@tanstack/react-query'
```

---

## 4. Barrel exports (`index.ts`)

### Khi nào dùng
- Nhóm components có liên quan, export nhiều thứ ra ngoài module

```ts
// src/components/builder/index.ts  ✅
export { StepList } from './StepList'
export { StepCard } from './StepCard'
export { FieldCard } from './FieldCard'
```

### Khi nào KHÔNG dùng
- File store — import trực tiếp để tránh circular dependency
- File `lib/utils.ts` — import trực tiếp
- Pages trong App Router — Next.js tự handle routing

```tsx
// ✅ Import trực tiếp store
import { useBuilderStore } from '@/store/builder.store'

// ❌ Đừng tạo src/store/index.ts rồi re-export
// Dễ gây circular nếu store import component
import { useBuilderStore } from '@/store'
```

### Cảnh báo circular dependency
Nếu `A` import `B` và `B` import `A` qua barrel → build lỗi hoặc runtime undefined.
Dấu hiệu: `Cannot access 'X' before initialization`.

---

## 5. Quy tắc Next.js App Router

### File đặc biệt — đặt đúng chỗ, đúng tên
| File | Mục đích |
|---|---|
| `page.tsx` | Route UI, export default async function |
| `layout.tsx` | Layout bọc ngoài, giữ state giữa navigations |
| `loading.tsx` | Suspense fallback tự động |
| `error.tsx` | Error boundary — bắt buộc `'use client'` |
| `not-found.tsx` | 404 của route segment đó |

```
src/app/
├── layout.tsx                           ← Root layout, wrap <Providers>
├── (dashboard)/
│   ├── layout.tsx                       ← Dashboard layout có sidebar
│   └── forms/
│       ├── page.tsx                     ← /forms — danh sách form
│       ├── loading.tsx                  ← Skeleton khi fetch
│       └── error.tsx                    ← Error UI, 'use client'
├── (builder)/
│   └── forms/[id]/builder/
│       └── page.tsx                     ← /forms/[id]/builder
└── f/
    └── [formId]/
        └── page.tsx                     ← Public form — SSR, no auth
```

### Route groups `(name)` — không ảnh hưởng URL
```
(dashboard)/forms/page.tsx              → URL: /forms
(builder)/forms/[id]/builder/page.tsx   → URL: /forms/[id]/builder
```

### `page.tsx` — params là Promise trong Next.js 15

```tsx
// ✅ — Đúng cách trong Next.js 15
interface Props {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  return <BuilderShell formId={id} />
}
```

```tsx
// ❌ — Sai, gây lỗi trong Next.js 15
export default async function BuilderPage({ params }: { params: { id: string } }) {
  const { id } = params  // params là Promise, không destructure trực tiếp được
}
```
