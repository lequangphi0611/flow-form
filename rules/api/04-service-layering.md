# 04 — Repository/Service Layering Pattern

## Kiến trúc 3 tầng

FlowForm API theo mô hình **Controller → Service → Repository**. Mỗi tầng có trách nhiệm riêng biệt và không được vượt qua tầng giữa.

```
┌─────────────────────────────────────────────────────────┐
│  Controller                                             │
│  - HTTP routing, guards, DTO binding                    │
│  - KHÔNG có business logic                             │
│  - KHÔNG gọi Prisma trực tiếp                         │
├─────────────────────────────────────────────────────────┤
│  Service                                                │
│  - Business logic (CQRS light: command + query)         │
│  - Orchestrate nhiều repository calls nếu cần           │
│  - Throw NestJS exceptions (NotFoundException, etc.)    │
│  - KHÔNG gọi Prisma trực tiếp                         │
├─────────────────────────────────────────────────────────┤
│  Repository                                             │
│  - Tất cả Prisma calls                                  │
│  - Convert Prisma errors sang NestJS exceptions         │
│  - Narrow JSONB fields bằng Zod ngay khi đọc từ DB     │
│  - KHÔNG có business logic                             │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Controller — HTTP layer, không có logic

```ts
// ✅ — src/modules/forms/forms.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { FormOwnerGuard } from './guards/form-owner.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { createFormSchema, updateFormSchema, paginationSchema } from '@flowform/validators'
import type { CreateFormDto, UpdateFormDto, PaginationDto, SessionUser } from '@flowform/validators'
import { FormsService } from './forms.service'

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // === PUBLIC — không cần auth ===

  @Get(':id')
  getPublicForm(@Param('id') id: string) {
    return this.formsService.getPublicForm(id)
  }

  // === AUTH REQUIRED ===

  @Get()
  @UseGuards(AuthGuard)
  listForms(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: PaginationDto,
  ) {
    return this.formsService.getFormsByOwner(user.id, pagination)
  }

  @Post()
  @UseGuards(AuthGuard)
  createForm(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto,
  ) {
    return this.formsService.createForm(user.id, dto)
  }

  // === OWNERSHIP REQUIRED ===

  @Patch(':id')
  @UseGuards(AuthGuard, FormOwnerGuard)
  updateForm(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFormSchema)) dto: UpdateFormDto,
  ) {
    return this.formsService.updateForm(id, dto)
  }

  @Delete(':id')
  @UseGuards(AuthGuard, FormOwnerGuard)
  deleteForm(@Param('id') id: string) {
    return this.formsService.deleteForm(id)
  }
}
```

```ts
// ❌ — Business logic trong Controller
@Post()
@UseGuards(AuthGuard)
async createForm(@Body() body: unknown, @CurrentUser() user: SessionUser) {
  const parsed = createFormSchema.safeParse(body) // ❌ validation thuộc Pipe
  if (!parsed.success) throw new BadRequestException(...)

  if (!user.isPremium && body.steps?.length > 5) { // ❌ business rule thuộc Service
    throw new ForbiddenException('Free tier limit')
  }

  return this.prisma.form.create({ ... }) // ❌ DB call thuộc Repository
}
```

---

## 2. Service — Business logic & CQRS light

Service phân tách rõ **Query methods** (đọc, không side effect) và **Command methods** (write, có side effect). Comment phân chia bằng `// === QUERY ===` và `// === COMMAND ===`.

```ts
// ✅ — src/modules/forms/forms.service.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { FormsRepository } from './forms.repository'
import type { CreateFormDto, UpdateFormDto, PaginationDto } from '@flowform/validators'

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name)

  constructor(private readonly formsRepository: FormsRepository) {}

  // === QUERY ===

  async getPublicForm(id: string) {
    const form = await this.formsRepository.findPublishedById(id)
    if (!form) throw new NotFoundException(`Form '${id}' not found or not published`)
    return form
  }

  async getFormsByOwner(ownerId: string, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.formsRepository.findByOwner(ownerId, pagination),
      this.formsRepository.countByOwner(ownerId),
    ])

    return {
      data: items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
      },
    }
  }

  // Reusable internal query — dùng bởi commands và guards
  async getFormOrThrow(id: string) {
    const form = await this.formsRepository.findById(id)
    if (!form) throw new NotFoundException(`Form '${id}' not found`)
    return form
  }

  // === COMMAND ===

  async createForm(ownerId: string, dto: CreateFormDto) {
    this.logger.log(`Creating form for user ${ownerId}`)
    return this.formsRepository.create(ownerId, dto)
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    await this.getFormOrThrow(id) // xác nhận tồn tại trước khi update
    return this.formsRepository.update(id, dto)
  }

  async deleteForm(id: string) {
    await this.getFormOrThrow(id)
    await this.formsRepository.delete(id)
    this.logger.log(`Form deleted: ${id}`)
  }

  async publishForm(id: string) {
    const form = await this.getFormOrThrow(id)

    // Business rule: form phải có ít nhất 1 step để publish
    if (!form.schema?.steps?.length) {
      throw new UnprocessableEntityException({
        type: 'https://flowform.dev/errors/form-empty',
        title: 'Form Cannot Be Published',
        status: 422,
        detail: 'Form must have at least one step before publishing.',
      })
    }

    return this.formsRepository.publish(id)
  }
}
```

---

## 3. Repository — Prisma layer

```ts
// ✅ — src/modules/forms/forms.repository.ts
import { Injectable, Logger } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PrismaService } from '@/prisma/prisma.service'
import { formSchemaValidator } from '@flowform/validators'
import type { CreateFormDto, UpdateFormDto, PaginationDto } from '@flowform/validators'

@Injectable()
export class FormsRepository {
  private readonly logger = new Logger(FormsRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const raw = await this.prisma.form.findUnique({ where: { id } })
    if (!raw) return null
    return this.hydrate(raw)
  }

  async findPublishedById(id: string) {
    const raw = await this.prisma.form.findFirst({
      where: { id, isPublished: true },
    })
    if (!raw) return null
    return this.hydrate(raw)
  }

  async findByOwner(ownerId: string, pagination: PaginationDto) {
    const raws = await this.prisma.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    })
    return raws.map((r) => this.hydrate(r))
  }

  async countByOwner(ownerId: string) {
    return this.prisma.form.count({ where: { ownerId } })
  }

  async create(ownerId: string, dto: CreateFormDto) {
    const raw = await this.prisma.form.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description ?? null,
        schema: dto.schema ?? {},
      },
    })
    return this.hydrate(raw)
  }

  async update(id: string, dto: UpdateFormDto) {
    const raw = await this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.schema !== undefined && { schema: dto.schema }),
      },
    })
    return this.hydrate(raw)
  }

  async delete(id: string) {
    try {
      await this.prisma.form.delete({ where: { id } })
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        return // idempotent delete — không throw nếu đã xóa rồi
      }
      throw err
    }
  }

  async publish(id: string) {
    const raw = await this.prisma.form.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    })
    return this.hydrate(raw)
  }

  // hydrate: narrow JSONB fields và map to typed entity
  private hydrate(raw: Awaited<ReturnType<typeof this.prisma.form.findUniqueOrThrow>>) {
    const schema = raw.schema != null
      ? formSchemaValidator.parse(raw.schema) // ❌ throw ZodError nếu JSONB corrupt
      : null

    return { ...raw, schema }
  }
}
```

---

## 4. Response format — flat vs envelope

Áp dụng nhất quán theo loại endpoint:

```ts
// ✅ — Single resource → flat object
// GET /api/forms/:id
{
  "id": "...",
  "title": "Contact Form",
  "schema": { ... },
  "isPublished": false,
  "createdAt": "2026-01-15T08:00:00.000Z"
}

// ✅ — Collection → envelope
// GET /api/forms
{
  "data": [
    { "id": "...", "title": "Contact Form", ... },
    { "id": "...", "title": "Survey", ... }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

```ts
// ❌ — Collection không có meta (không biết tổng số để paginate)
// GET /api/forms
[{ "id": "...", "title": "Contact Form" }]

// ❌ — Single resource bọc trong envelope thừa
// GET /api/forms/:id
{ "data": { "id": "...", "title": "Contact Form" } }
```

---

## 5. Dependency injection — không instantiate thủ công

```ts
// ✅ — Inject qua constructor
@Injectable()
export class FormsService {
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}
}

// ❌ — Instantiate trong constructor hoặc method
constructor() {
  this.formsRepository = new FormsRepository() // ❌
}
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Controller gọi Repository trực tiếp (bỏ qua Service)
@Get(':id')
getForm(@Param('id') id: string) {
  return this.formsRepository.findById(id) // ❌ bypass business logic
}

// ❌ — Service có Prisma dependency trực tiếp
@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {} // ❌ Repository thiếu
}

// ❌ — Repository có business logic
async findById(id: string) {
  const form = await this.prisma.form.findUnique({ where: { id } })
  if (!form.isPublished) throw new ForbiddenException('Not published') // ❌ business rule
  return form
}

// ❌ — Service trả về raw Prisma entity (bao gồm internal fields)
async getFormOrThrow(id: string) {
  return this.prisma.form.findUniqueOrThrow({ where: { id } })
  // ❌ expose ownerId, internal timestamps, unvalidated JSONB
}
```
