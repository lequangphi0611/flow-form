# 03 — Clean Code

**Layer**: Shared (Frontend + Backend)
**Category**: Code Quality
**Severity**: Warning
**Enforcement**: Manual Review, ESLint (`no-unused-vars`, `no-console`, `@typescript-eslint/no-explicit-any`)
**Related Rules**: rules/frontend/16-typescript.md, rules/api/01-module-structure.md

## Rationale

Những rule này áp dụng đồng đều cho cả `apps/web` (Next.js) và `apps/api` (NestJS). Chúng giải quyết các vấn đề không được cover bởi các rule layer-specific: function design, naming, magic values, và dead code.

---

## 1. Function Design

### Giới hạn độ dài

Max ~30 lines per function/method (không tính blank lines và braces). Nếu dài hơn, extract thành helper có tên mô tả rõ behavior.

### Guard clauses — early return trước, happy path sau

```ts
// ✅ — guard clauses trước, happy path ở cuối
async publishForm(id: string) {
  const form = await this.getFormOrThrow(id)
  if (form.status !== 'draft') throw new BadRequestException(...)
  if (form.steps.length === 0) throw new UnprocessableEntityException(...)
  return this.formsRepository.publish(id)  // happy path rõ ràng, không bị chôn
}

// ❌ — happy path bị lồng sâu trong nested if
async publishForm(id: string) {
  const form = await this.getFormOrThrow(id)
  if (form.status === 'draft') {
    if (form.steps.length > 0) {
      return this.formsRepository.publish(id)  // phải đọc hết mới tìm ra happy path
    } else {
      throw new UnprocessableEntityException(...)
    }
  } else {
    throw new BadRequestException(...)
  }
}
```

### No boolean flag parameters

```ts
// ❌ — 1 function có 2 behaviors, caller phải đọc implementation để hiểu
function renderField(field: FieldSchema, readOnly: boolean) { ... }

// ✅ — 2 function với tên rõ ràng
function renderEditableField(field: FieldSchema) { ... }
function renderReadOnlyField(field: FieldSchema) { ... }
```

### One level of abstraction per function

```ts
// ❌ — mix high-level orchestration với low-level DB detail trong cùng 1 method
async createForm(userId: string, dto: CreateFormDraftDto) {
  const form = await this.prisma.form.create({   // low-level: thuộc repository
    data: { ownerId: userId, title: dto.title, status: 'draft', schema: { steps: [] } }
  })
  this.logger.log(`Form created: ${form.id}`)
  return form
}

// ✅ — service chỉ orchestrate, repository lo detail
async createForm(userId: string, dto: CreateFormDraftDto) {
  this.logger.log(`Creating form for user ${userId}`)
  return this.formsRepository.create(userId, dto.title)
}
```

---

## 2. Naming Conventions

### Booleans — prefix `is`, `has`, `can`, `should`

```ts
// ✅
const isPublished = form.status === 'published'
const hasSteps = form.steps.length > 0
const canSubmit = isPublished && !isSubmitting
const shouldRedirect = form.settings.redirectUrl != null

// ❌
const published = form.status === 'published'  // trông giống string value
const stepsExist = form.steps.length > 0       // "exist" không phải chuẩn
const submitEnabled = !isSubmitting            // không có prefix
```

### Functions — verb + noun

```ts
// ✅
getFormOrThrow()    findByOwner()       parseSchema()
createForm()        updateForm()        publishForm()
handleSubmit()      handleDelete()      onFieldChange()   // event handlers: handle/on prefix

// ❌
form()              // thiếu verb — làm gì với form?
doForm()            // verb quá mơ hồ
processData()       // "data" quá generic, "process" không mô tả gì
```

### Constants — SCREAMING_SNAKE_CASE cho module-level immutable values

```ts
// ✅ — module-level constant
const MAX_TITLE_LENGTH = 100
const DEFAULT_PAGE_SIZE = 20
const DEBOUNCE_MS = 300
const FORM_QUERY_KEY = ['forms'] as const

// ❌
const maxTitleLength = 100   // camelCase → nhìn như variable thường, không phân biệt được
const max = 100              // quá ngắn, không rõ max gì
```

```ts
// Ngoại lệ: local const trong function body dùng camelCase bình thường
function buildFormUrl(id: string) {
  const basePath = '/forms'          // local const — camelCase OK
  return `${basePath}/${id}/editor`
}
```

### Arrays — luôn plural

```ts
// ✅
const forms: FormSchema[] = []
const steps: StepSchema[] = []
const errors: string[] = []
const selectedIds: string[] = []

// ❌
const formList = []    // "List" suffix thừa — type đã nói lên array rồi
const formData = []    // "Data" không mô tả gì
const form = []        // singular nhưng là array — rất dễ nhầm
```

### Tránh tên generic

```ts
// ❌
const data = await formsApi.list()
const result = formBodySchema.safeParse(raw.schema)
const temp = form.steps.filter(s => s.fields.length > 0)
const obj = { id: form.id, title: form.title }
const item = forms[0]

// ✅
const forms = await formsApi.list()
const schemaParseResult = formBodySchema.safeParse(raw.schema)
const stepsWithFields = form.steps.filter(s => s.fields.length > 0)
const formSummary = { id: form.id, title: form.title }
const firstForm = forms[0]
```

---

## 3. No Magic Values

Magic value là số hoặc string literal xuất hiện trực tiếp trong code mà không có tên giải thích ý nghĩa.

```ts
// ❌ — magic values
await new Promise(resolve => setTimeout(resolve, 300))
if (title.length > 100) throw new BadRequestException(...)
orderBy: { updatedAt: 'desc' },
skip: (page - 1) * 20,
```

```ts
// ✅ — named constants
const DEBOUNCE_MS = 300
const MAX_TITLE_LENGTH = 100
const DEFAULT_PAGE_SIZE = 20

await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS))
if (title.length > MAX_TITLE_LENGTH) throw new BadRequestException(...)
skip: (page - 1) * DEFAULT_PAGE_SIZE,
```

**Ngoại lệ — không cần extract khi:**
- Value chỉ xuất hiện đúng 1 lần và context đã self-explanatory:
  ```ts
  take: 10,          // rõ ràng là "lấy 10 bản ghi" — không cần constant
  status: 'draft',   // Zod enum đã document — không cần constant
  ```
- Value là part of HTTP standard:
  ```ts
  @HttpCode(HttpStatus.NO_CONTENT)   // 204 — framework đã named
  status: 200                         // standard HTTP
  ```

---

## 4. No Dead Code + No `any`

### Unused imports và variables

```ts
// ❌ — unused imports
import { useState, useEffect, useCallback } from 'react'  // useCallback không dùng
import type { FormSchema, StepSchema } from '@flowform/types'  // StepSchema không dùng

// ❌ — unused variable
const [isOpen, setIsOpen] = useState(false)  // isOpen không được render hay đọc ở đâu

// ✅ — chỉ import những gì thực sự dùng
import { useState, useEffect } from 'react'
import type { FormSchema } from '@flowform/types'
```

### TODO không có issue reference

```ts
// ❌
// TODO: fix this later
// TODO: handle error
// FIXME: broken on mobile

// ✅ — có issue reference, hoặc xóa hẳn nếu không plan to fix
// TODO(#42): handle network timeout — blocked on infra ticket
```

### `any` type

```ts
// ❌
const result = response as any
function processBody(body: any) { ... }
const secret = (form as any).internalField

// ✅ — unknown + type narrowing
function processBody(body: unknown) {
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) throw new BadRequestException(...)
  return parsed.data  // fully typed
}
```

### `console.log`

```ts
// ❌ — không commit console.log
console.log('response:', response)
console.log('debug form:', form)

// ✅ — Backend: dùng NestJS Logger
private readonly logger = new Logger(FormsService.name)
this.logger.log(`Form published: ${id}`)
this.logger.warn(`Schema parse failed for form ${id}: ${err.message}`)

// ✅ — Frontend: toast cho user-facing errors, không log internals
toast.error('Không thể lưu form. Vui lòng thử lại.')
```

### `@ts-ignore` vs `@ts-expect-error`

```ts
// ❌ — ts-ignore im lặng ngay cả khi type đã được fix sau đó
// @ts-ignore
prismaForm.customField = value

// ✅ — ts-expect-error báo lỗi compile nếu type đã được fix (tránh stale suppression)
// @ts-expect-error — Prisma type chưa reflect custom scalar, xem issue #78
prismaForm.customField = value
```

---

## PR Checklist — Clean Code

Trước khi merge bất kỳ PR nào:

- [ ] Không có unused imports/variables (`ESLint no-unused-vars`)
- [ ] Không có `console.log` (`ESLint no-console`)
- [ ] Không có `any` cast không có comment giải thích
- [ ] Mọi boolean variable/prop có prefix `is/has/can/should`
- [ ] Mọi module-level constant dùng `SCREAMING_SNAKE_CASE`
- [ ] Không có function/method dài quá 30 dòng
- [ ] Guard clauses đứng đầu function, happy path ở cuối
- [ ] Không có magic number/string (trừ các ngoại lệ được ghi chú)
- [ ] Không có `TODO` không có issue reference
