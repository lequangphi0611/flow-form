# 02 — DTO Validation Strategy

## Kiến trúc validation

FlowForm dùng **Zod schemas từ `@flowform/validators`** (shared package) làm nguồn truth duy nhất, thay vì `class-validator` decorators. Một custom NestJS pipe chuyển đổi và validate request body trước khi đến controller handler.

```
Request Body (raw JSON)
        │
        ▼
  ZodValidationPipe        ← global pipe, parse + validate bằng Zod schema
        │
        ▼ (typed DTO object hoặc throw 422)
  Controller Handler
        │
        ▼
    Service layer
```

---

## 1. DTO class — chỉ là type carrier, không có validation decorator

DTO trong FlowForm là class TypeScript thuần. Không dùng `@IsString()`, `@IsEmail()` của `class-validator`.

```ts
// ✅ — src/modules/forms/dto/create-form.dto.ts
export class CreateFormDto {
  title: string
  description?: string
  schema: unknown  // JSONB — sẽ được validate bằng Zod schema riêng
}
```

```ts
// ❌ — Dùng class-validator decorators
import { IsString, IsOptional, MaxLength } from 'class-validator'

export class CreateFormDto {
  @IsString()
  @MaxLength(200)
  title: string  // ❌ — duplicate validation với Zod schema, dễ bị lệch

  @IsOptional()
  description?: string
}
```

---

## 2. Zod schemas — định nghĩa trong `@flowform/validators`

Mọi schema validation được đặt trong `packages/validators/`. Schema chia sẻ giữa frontend và backend — chỉ định nghĩa 1 lần.

```ts
// ✅ — packages/validators/src/form.schema.ts
import { z } from 'zod'
import { fieldSchema } from './field.schema'

export const createFormSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200),
  description: z.string().max(1000).optional(),
  schema: z
    .object({
      steps: z.array(z.object({
        id: z.string().uuid(),
        title: z.string(),
        fields: z.array(fieldSchema),
      })),
      settings: z.object({
        allowDraft: z.boolean().default(false),
        redirectUrl: z.string().url().optional(),
      }),
    })
    .optional(),
})

export type CreateFormDto = z.infer<typeof createFormSchema>
```

```ts
// ✅ — Import schema trong NestJS service/pipe
import { createFormSchema } from '@flowform/validators'
```

---

## 3. ZodValidationPipe — custom pipe bắt buộc

Tạo pipe một lần, dùng toàn project. Pipe nhận Zod schema và validate request body.

```ts
// ✅ — src/common/pipes/zod-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'
import { ZodSchema, ZodError } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException({
        type: 'https://flowform.dev/errors/validation',
        title: 'Validation Failed',
        status: 400,
        detail: 'Request body failed schema validation',
        errors: result.error.flatten().fieldErrors,
      })
    }

    return result.data
  }
}
```

```ts
// ✅ — Dùng trong controller với @Body()
import { Controller, Post, Body, UsePipes } from '@nestjs/common'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { createFormSchema } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

@Controller('forms')
export class FormsController {
  @Post()
  @UseGuards(AuthGuard)
  async createForm(
    @Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.formsService.createForm(user.id, dto)
  }
}
```

---

## 4. JSONB validation — validate cả read và write

Prisma trả về `Json` column (JSONB) với type `any`. Phải parse qua Zod schema ngay khi nhận từ DB — không truyền raw `any` vào service logic.

```ts
// ✅ — src/modules/forms/forms.repository.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { formSchemaValidator } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const raw = await this.prisma.form.findUnique({ where: { id } })
    if (!raw) return null

    // ✅ Narrow JSONB fields ngay khi đọc từ DB
    const schema = raw.schema != null
      ? formSchemaValidator.parse(raw.schema) // throws ZodError nếu DB corrupt
      : null

    return { ...raw, schema }
  }

  async create(ownerId: string, dto: CreateFormDto) {
    // ✅ DTO đã được validate bởi ZodValidationPipe trong controller
    // ✅ Zod schema đảm bảo dto.schema đúng shape trước khi lưu
    return this.prisma.form.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description,
        schema: dto.schema ?? {}, // Prisma nhận plain object cho JSONB
      },
    })
  }
}
```

```ts
// ❌ — Truyền raw JSONB không validate
async findById(id: string) {
  const form = await this.prisma.form.findUnique({ where: { id } })
  return form // ❌ form.schema là `any` — không biết shape, dễ crash runtime
}
```

---

## 5. Response DTO — chỉ expose field cần thiết

Không trả toàn bộ Prisma entity raw về client. Dùng response DTO để control shape và tránh leak sensitive fields.

```ts
// ✅ — src/modules/forms/dto/form-response.dto.ts
export interface FormResponseDto {
  id: string
  title: string
  description: string | null
  schema: FormSchemaType | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
  // ❌ KHÔNG có: ownerId (private), internal flags
}
```

```ts
// ✅ — src/modules/forms/forms.service.ts — map entity → response DTO
import type { Form } from '@prisma/client'
import type { FormResponseDto } from './dto/form-response.dto'

function toFormResponse(form: Form & { schema: FormSchemaType | null }): FormResponseDto {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    schema: form.schema,
    isPublished: form.isPublished,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  }
}
```

```ts
// ❌ — Trả raw Prisma entity
async getFormById(id: string) {
  return this.prisma.form.findUnique({ where: { id } })
  // ❌ expose ownerId, internal flags, Date objects (không serialize đúng)
}
```

---

## 6. Validate query params

Query params cũng cần validate bằng Zod, không chỉ request body.

```ts
// ✅ — packages/validators/src/pagination.schema.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationDto = z.infer<typeof paginationSchema>
```

```ts
// ✅ — Dùng trong controller
@Get()
@UseGuards(AuthGuard)
async listForms(
  @Query(new ZodValidationPipe(paginationSchema)) pagination: PaginationDto,
  @CurrentUser() user: SessionUser,
) {
  return this.formsService.getFormsByOwner(user.id, pagination)
}
```

```ts
// ❌ — Parse query param thủ công trong service
async getFormsByOwner(ownerId: string, page: string, limit: string) {
  const pageNum = parseInt(page) || 1  // ❌ không validate range, không có type safety
  const limitNum = parseInt(limit) || 20
}
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Validate trong Service, không phải Pipe
async createForm(ownerId: string, body: unknown) {
  const result = createFormSchema.safeParse(body) // ❌ validate quá muộn — body đã vào service
  if (!result.success) throw new BadRequestException(...)
}
```

```ts
// ❌ — Dùng class-transformer + class-validator
import { IsString } from 'class-validator'
export class CreateFormDto {
  @IsString()
  title: string // ❌ duplicate với Zod, inconsistent với frontend validation
}
```

```ts
// ❌ — Không validate JSONB khi đọc từ DB
const form = await this.prisma.form.findUnique({ where: { id } })
const steps = (form.schema as any).steps // ❌ any cast không có validation
```
