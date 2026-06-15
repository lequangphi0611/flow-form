# 19 — URL State (Search Params)

## Nguyên tắc

State ảnh hưởng đến **kết quả hiển thị** và nên **shareable / survives refresh** → lưu trong URL.

| State | Lưu ở đâu |
|---|---|
| Search query, filter, sort | **URL search params** |
| Trang hiện tại (pagination) | **URL search params** |
| Selected step/field trong Builder | **Zustand** (không cần share) |
| Dialog open/close | **useState** (ephemeral) |
| Form input chưa submit | **React Hook Form** |

---

## 1. Đọc search params

```tsx
// ✅ — src/app/(dashboard)/forms/page.tsx
// Cách đọc trong Server Component (async, type-safe)
interface SearchParams {
  q?: string
  sort?: 'newest' | 'oldest'
  status?: 'all' | 'published' | 'draft'
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', sort = 'newest', status = 'all' } = await searchParams

  const forms = await getForms({ q, sort, status })

  return (
    <div className="p-6 space-y-6">
      <FormFilters currentQ={q} currentSort={sort} currentStatus={status} />
      <FormGrid forms={forms} />
    </div>
  )
}
```

```tsx
// ✅ — Đọc trong Client Component (useSearchParams)
'use client'

import { useSearchParams } from 'next/navigation'

export function FormFilters() {
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'newest') as 'newest' | 'oldest'
  const status = (searchParams.get('status') ?? 'all') as 'all' | 'published' | 'draft'

  // ...
}
```

---

## 2. Cập nhật search params

```tsx
// ✅ — Helper để build URL params không gây side effect
// src/lib/url-params.ts
export function buildSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const params = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') {
      params.delete(key)  // xóa param nếu về default
    } else {
      params.set(key, value)
    }
  }

  return params.toString()
}
```

```tsx
// ✅ — FormFilters: update URL khi filter thay đổi
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { buildSearchParams } from '@/lib/url-params'

export function FormFilters({
  currentQ,
  currentSort,
  currentStatus,
}: {
  currentQ: string
  currentSort: string
  currentStatus: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const qs = buildSearchParams(searchParams, { [key]: value })
      startTransition(() => {
        router.push(`${pathname}?${qs}`)
      })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-3">
      {/* Search input — debounce trước khi update URL */}
      <SearchInput
        defaultValue={currentQ}
        onSearch={(value) => updateParam('q', value || null)}
      />

      {/* Sort dropdown */}
      <Select value={currentSort} onValueChange={(v) => updateParam('sort', v === 'newest' ? null : v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mới nhất</SelectItem>
          <SelectItem value="oldest">Cũ nhất</SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={currentStatus} onValueChange={(v) => updateParam('status', v === 'all' ? null : v)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="published">Đã xuất bản</SelectItem>
          <SelectItem value="draft">Nháp</SelectItem>
        </SelectContent>
      </Select>

      {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  )
}
```

---

## 3. Search input — debounce trước khi update URL

Không update URL mỗi keystroke — sẽ tạo quá nhiều history entries.

```tsx
// ✅ — src/components/common/SearchInput.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  defaultValue?: string
  onSearch: (value: string) => void
  debounceMs?: number
}

export function SearchInput({ defaultValue = '', onSearch, debounceMs = 400 }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Sync với URL nếu defaultValue thay đổi từ bên ngoài
    setValue(defaultValue)
  }, [defaultValue])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setValue(newValue)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onSearch(newValue)
    }, debounceMs)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Tìm form..."
        className="h-9 pl-9 pr-3 border rounded-md text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
```

---

## 4. Pagination với URL params

```tsx
// ✅ — Page param trong URL
// URL: /forms?page=2&q=survey

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page = '1', q = '' } = await searchParams
  const currentPage = Math.max(1, parseInt(page, 10))

  const { forms, total, pageSize } = await getForms({ q, page: currentPage })

  return (
    <div className="p-6 space-y-6">
      <FormGrid forms={forms} />
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / pageSize)}
      />
    </div>
  )
}
```

```tsx
// ✅ — Pagination component cập nhật URL
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { buildSearchParams } from '@/lib/url-params'

export function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function goToPage(page: number) {
    const qs = buildSearchParams(searchParams, {
      page: page === 1 ? null : String(page),  // page=1 là default → xóa khỏi URL
    })
    router.push(`${pathname}?${qs}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
      >
        Trước
      </button>
      <span className="text-sm text-gray-600">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50"
      >
        Sau
      </button>
    </div>
  )
}
```

---

## Những điều KHÔNG làm

```tsx
// ❌ — useState cho filter/search — không shareable, mất khi refresh
export function FormsPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  // User không thể copy URL để share kết quả tìm kiếm
}
```

```tsx
// ❌ — Zustand cho dashboard filter state
const useFilterStore = create(() => ({ q: '', sort: 'newest' }))
// Overkill — URL đã là "store" hoàn hảo cho state này
```

```tsx
// ❌ — Update URL mỗi keystroke (không debounce)
<input onChange={(e) => router.push(`?q=${e.target.value}`)} />
// → tạo 1 history entry mỗi ký tự → Back button phải nhấn 20 lần
```
