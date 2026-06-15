# 16 — TypeScript Discipline

> Project dùng `"strict": true` trong tsconfig. Rule này định nghĩa cách xử lý các tình huống TypeScript khó mà không làm suy yếu type safety.

---

## 1. Type assertion `as` — khi nào cho phép

```ts
// ✅ — Cho phép khi bạn chắc chắn về shape (API response đã validate ở server)
const form = data as FormSchema
// Server đã có ValidationPipe + Prisma type-safe → shape đảm bảo

// ✅ — Cho phép khi TypeScript không thể infer nhưng bạn biết chắc
const el = document.getElementById('portal') as HTMLDivElement

// ✅ — Cho phép trong test helpers và type narrowing
const input = wrapper.find('input') as HTMLInputElement
```

```ts
// ❌ — Dùng as để tắt lỗi TypeScript mà không hiểu tại sao lỗi
const result = someFunction() as any  // ❌ che giấu lỗi thật sự
const form = {} as FormSchema          // ❌ object rỗng không phải FormSchema
```

**Quy tắc:** `as Type` được phép khi bạn có lý do cụ thể. Nếu dùng `as` để "TypeScript không báo đỏ nữa" mà không hiểu tại sao → dừng lại và tìm hiểu.

---

## 2. `any` — gần như luôn cấm

```ts
// ❌ — any trong components và lib/
const handleChange = (e: any) => { ... }       // dùng React.ChangeEvent<HTMLInputElement>
const data: any = await fetchForm(id)           // dùng Promise<FormSchema>
function process(input: any) { ... }            // dùng unknown hoặc type cụ thể
```

```ts
// ✅ — any chỉ chấp nhận trong adapter code — phải có comment giải thích
// src/modules/jobs/jobs.service.ts
await this.boss.work(JOB_EXPORT_CSV, async (job: any) => {
  // pg-boss v10 không export JobWithDoneCallback type — any là bắt buộc ở đây
  const { formId } = job.data as { formId: string }
})
```

**Quy tắc:** Trước khi dùng `any`, hỏi: "Tôi có thể dùng `unknown` không?" — nếu có, dùng `unknown`.

---

## 3. `unknown` — thay thế đúng cho `any`

```ts
// ✅ — unknown khi type thực sự không biết, buộc phải narrow trước khi dùng
async function parseApiResponse(raw: unknown): Promise<FormSchema> {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid response')
  return raw as FormSchema  // narrow xong mới as
}

// ✅ — Error trong catch block là unknown (TypeScript 4.4+)
try {
  await formsApi.delete(id)
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message)  // safe
  } else {
    toast.error('Đã xảy ra lỗi')
  }
}
```

```ts
// ❌ — Bắt error và dùng luôn không narrow
} catch (error: any) {       // ❌ dùng any cho error
  toast.error(error.message) // crash nếu error không phải Error object
}
```

---

## 4. `@ts-ignore` vs `@ts-expect-error`

```ts
// ❌ — @ts-ignore bị cấm hoàn toàn
// @ts-ignore
someLibrary.methodNotInTypes()
```

```ts
// ✅ — @ts-expect-error được phép với comment bắt buộc
// @ts-expect-error — better-auth v1 chưa export SessionUser type, xem issue #123
const user = session.user as BetterAuthUser
```

**Quy tắc:**
- `@ts-ignore` → không bao giờ dùng (suppress mọi lỗi kể cả lỗi mới)
- `@ts-expect-error` → chỉ dùng khi thực sự bắt buộc, **phải** có comment giải thích lý do

---

## 5. Non-null assertion `!` — dùng có chủ đích

```ts
// ✅ — Sau khi đã check null ở trên
const step = form.steps.find((s) => s.id === selectedStepId)
if (!step) return null  // ← đã guard

const field = step.fields.find((f) => f.id === fieldId)!  // ✅ step đã tồn tại, field chắc chắn có
```

```ts
// ❌ — Non-null assertion vô căn cứ
const form = useBuilderStore((s) => s.form)!  // ❌ form có thể null trong lần render đầu
```

---

## 6. Generics — ưu tiên hơn overload

```ts
// ✅ — Generic function
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// Dùng:
const form = await handleResponse<FormSchema>(res)
const forms = await handleResponse<FormSchema[]>(res)
```

```ts
// ❌ — Overload thừa
async function handleResponse(res: Response): Promise<FormSchema>
async function handleResponse(res: Response): Promise<FormSchema[]>
async function handleResponse(res: Response): Promise<unknown> { ... }
```

---

## 7. Type vs Interface cho props

> Đã có trong rule `02-components.md` — tóm tắt nhanh:

```ts
// ✅ — interface cho component props (có thể extend)
interface FormCardProps {
  form: FormSchema
  onDelete?: (id: string) => void
}

// ✅ — type cho union, intersection, utility types
type FormStatus = 'draft' | 'published' | 'archived'
type FormWithOwner = FormSchema & { ownerName: string }
type PartialForm = Partial<Pick<FormSchema, 'title' | 'description'>>
```

---

## Tóm tắt nhanh

| Construct | Được phép? | Điều kiện |
|---|---|---|
| `as Type` | ✅ | Biết chắc shape, có lý do |
| `any` | ⚠️ Hạn chế | Chỉ adapter code + có comment |
| `unknown` | ✅ | Khi type không xác định |
| `@ts-ignore` | ❌ | Không bao giờ |
| `@ts-expect-error` | ⚠️ Hạn chế | Phải có comment giải thích |
| `!` non-null | ⚠️ Hạn chế | Sau khi đã guard null ở trên |
| Generics | ✅ | Ưu tiên hơn overload |
