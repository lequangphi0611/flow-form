# FlowForm -- @flowform/validators

## MỤC ĐÍCH

Package này chứa **Zod schemas dùng chung** giữa `apps/web` (form validation) và `apps/api` (request validation). Mỗi schema luôn đi kèm với inferred TypeScript type được export.

Đây là nguồn truth duy nhất cho validation rules -- frontend và backend không bao giờ duplicate validation logic.

---

## QUY TẮC CĂN BẢN

### Một schema thuộc về đây khi:
- Được dùng bởi 2 hoặc nhiều app (`apps/web` và `apps/api` là trường hợp phổ biến nhất)
- Ví dụ: `createFormSchema` dùng trong `<FormSettingsPanel>` (web) và `POST /api/forms` (api)

### Một schema KHÔNG thuộc về đây khi:
- Chỉ dùng trong 1 app -- giữ nguyên trong app đó
- Chứa NestJS-specific code (pipes, decorators) -- không isomorphic
- Chứa browser-specific code -- không chạy được trong Node.js

### Quy tắc export bắt buộc:
Mỗi schema phải export cả schema lẫn inferred type:
```ts
export const createFormSchema = z.object({ ... })
export type CreateFormDto = z.infer<typeof createFormSchema>
```

---

## SCHEMAS HIỆN TẠI

| Schema | Dùng trong web | Dùng trong api |
|---|---|---|
| `createFormSchema` | FormSettingsPanel (React Hook Form) | POST /api/forms |
| `updateFormSchema` | Builder auto-save | PATCH /api/forms/:id |
| `formSchemaValidator` | Builder save validation | Repository hydrate JSONB |
| `paginationSchema` | Forms list query params | GET /api/forms |
| `uploadResponseSchema` | Parse upload response | POST /api/storage/upload response |
| `ALLOWED_MIME_TYPES` | File input accept attr | Multer fileFilter reference |
| `createSubmissionSchema` | Wizard submit | POST /api/forms/:id/responses |

---

## RULES

- [`../../rules/shared/02-validators-package.md`](../../rules/shared/02-validators-package.md) -- Khi nào đặt schema vào đây, format exports, cách dùng trong web (React Hook Form) và api (ZodValidationPipe)

---

## CÁCH DÙNG

**Trong apps/api (NestJS controller):**
```ts
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { createFormSchema } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

@Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto
```

**Trong apps/web (React Hook Form):**
```ts
import { zodResolver } from '@hookform/resolvers/zod'
import { createFormSchema } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

const form = useForm<CreateFormDto>({
  resolver: zodResolver(createFormSchema),
})
```

---

## LỆNH

```bash
# Type-check
cd packages/validators && npm run typecheck

# Build
cd packages/validators && npm run build
```

---

## QUAN HỆ VỚI @flowform/types

- `@flowform/types` chỉ chứa TypeScript types (không có runtime code)
- `@flowform/validators` chứa Zod schemas (có runtime code) + inferred types
- Một số types có thể xuất hiện ở cả hai: type thô trong `@flowform/types`, schema + validated type trong `@flowform/validators`
- Không duplicate: nếu đã có schema trong validators, không cần thêm interface tương tự vào types
