# 06 - Prisma Patterns

**Layer**: Backend
**Category**: Architecture, Performance, Security
**Severity**: Error
**Enforcement**: Manual Review, TypeScript (PrismaService type enforces DI)
**Related Rules**: rules/api/04-service-layering.md, rules/api/02-dto-validation.md

## Rationale

Prisma is the sole database access layer in FlowForm. Inconsistent usage -- multiple PrismaClient instances, untreated JSONB fields, or raw SQL via string concatenation -- leads to connection pool exhaustion, runtime type errors, and SQL injection vulnerabilities. These patterns establish a single, safe way to use Prisma throughout the codebase.

## Rule Definition

1. Never instantiate `PrismaClient` directly in a module or service -- use `PrismaService` via DI only.
2. Exception: `auth.config.ts` may use its own Prisma instance because Better Auth requires it; document this with a comment.
3. Never call `prisma.$disconnect()` manually -- `PrismaService` manages the lifecycle.
4. `select` for list queries (fetch only needed columns); `include` for single-resource queries that need relations.
5. Always parse JSONB fields (`Json` type) through a Zod schema immediately in the repository's `hydrate()` method before returning to service layer. Never pass raw `any` JSONB to service or controller.
6. Use `prisma.$transaction([...])` for multi-table writes. Never rely on sequential `await` statements being atomic.
7. Use `prisma.$queryRaw` with `Prisma.sql` tagged template for raw queries. Never concatenate strings into raw SQL.

## Correct Examples

```ts
// Good: PrismaService injected via constructor DI
// src/modules/forms/forms.repository.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}
}
```

```ts
// Good: exception -- auth.config.ts uses its own instance (Better Auth requirement)
// src/modules/auth/auth.config.ts

// NOTE: Better Auth requires its own PrismaClient instance -- do not use PrismaService here.
// This is the only place in the codebase where PrismaClient is instantiated directly.
import { PrismaClient } from '@prisma/client'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
})
```

```ts
// Good: select for list queries (only fetch needed columns)
async findByOwner(ownerId: string, pagination: PaginationDto) {
  return this.prisma.form.findMany({
    where: { ownerId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      // schema NOT selected -- it can be large JSONB, not needed in list
    },
    orderBy: { updatedAt: 'desc' },
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  })
}
```

```ts
// Good: include for single-resource query that needs relations
async findByIdWithResponses(id: string) {
  return this.prisma.form.findUnique({
    where: { id },
    include: {
      responses: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}
```

```ts
// Good: JSONB hydration with Zod in repository
// src/modules/forms/forms.repository.ts
import { formSchemaValidator } from '@flowform/validators'

@Injectable()
export class FormsRepository {
  private hydrate(raw: Awaited<ReturnType<typeof this.prisma.form.findUniqueOrThrow>>) {
    // raw.schema is type `any` from Prisma -- narrow immediately with Zod
    const schema = raw.schema != null
      ? formSchemaValidator.parse(raw.schema)  // throws ZodError if DB data is corrupt
      : null

    return { ...raw, schema }
  }

  async findById(id: string) {
    const raw = await this.prisma.form.findUnique({ where: { id } })
    if (!raw) return null
    return this.hydrate(raw)  // service receives typed data, never raw any
  }
}
```

```ts
// Good: transaction for multi-table write
async createFormWithInitialStep(ownerId: string, dto: CreateFormDto) {
  const [form, step] = await this.prisma.$transaction([
    this.prisma.form.create({
      data: { ownerId, title: dto.title, schema: {} },
    }),
    this.prisma.formStep.create({
      data: { formId: dto.formId, title: 'Step 1', order: 0 },
    }),
  ])
  return { form: this.hydrate(form), step }
}
```

```ts
// Good: raw query with Prisma.sql tagged template (JSONB operator example)
import { Prisma } from '@prisma/client'

async findFormsWithFieldType(ownerId: string, fieldType: string) {
  // Prisma.sql prevents SQL injection by parameterizing inputs
  return this.prisma.$queryRaw<{ id: string; title: string }[]>(
    Prisma.sql`
      SELECT id, title
      FROM forms
      WHERE owner_id = ${ownerId}
        AND schema->'steps' @> ${JSON.stringify([{ fields: [{ type: fieldType }] }])}::jsonb
    `
  )
}
```

## Incorrect Examples

```ts
// Bad: instantiating PrismaClient in a service
import { PrismaClient } from '@prisma/client'

@Injectable()
export class FormsService {
  private prisma = new PrismaClient()  // creates a second connection pool
}
```

```ts
// Bad: calling disconnect manually
@Injectable()
export class FormsRepository {
  async findById(id: string) {
    const result = await this.prisma.form.findUnique({ where: { id } })
    await this.prisma.$disconnect()  // disconnects the shared pool -- breaks other requests
    return result
  }
}
```

```ts
// Bad: include on list query fetching large relations unnecessarily
async findByOwner(ownerId: string) {
  return this.prisma.form.findMany({
    where: { ownerId },
    include: {
      responses: true,  // fetches ALL responses for ALL forms -- can be thousands of rows
    },
  })
}
```

```ts
// Bad: passing raw JSONB any to service layer without parsing
async findById(id: string) {
  const form = await this.prisma.form.findUnique({ where: { id } })
  return form  // form.schema is `any` -- service and controller handle untyped data
}
```

```ts
// Bad: sequential awaits treated as atomic
async transferOwnership(formId: string, newOwnerId: string) {
  await this.prisma.form.update({ where: { id: formId }, data: { ownerId: newOwnerId } })
  await this.prisma.auditLog.create({ data: { formId, action: 'transfer', newOwnerId } })
  // If the second await throws, the form has a new owner but no audit log -- inconsistent state
}
```

```ts
// Bad: string concatenation in raw query -- SQL injection risk
async searchForms(ownerId: string, keyword: string) {
  return this.prisma.$queryRawUnsafe(
    `SELECT * FROM forms WHERE owner_id = '${ownerId}' AND title ILIKE '%${keyword}%'`
    // keyword = "'; DROP TABLE forms; --" -- exploitable
  )
}
```

## JSONB default fallback — `??` không hoạt động với Prisma Json default

**Prisma schema:**
```prisma
settings Json @default("{}")
theme    Json @default("{}")
```

Prisma trả về `{}` (empty object) — không phải `null` — cho `@default("{}")`. Toán tử `??` chỉ fallback khi giá trị là `null`/`undefined`. `{}` là truthy nên **`?? DEFAULT_SETTINGS` không bao giờ chạy**.

```ts
// ❌ — Fallback chết vì {} là truthy
settings: (raw.settings as FormSettings) ?? DEFAULT_SETTINGS  // DEFAULT_SETTINGS không được dùng

// ✅ — Dùng safeParse để validate và lấy giá trị đúng
const settingsResult = formSettingsSchema.safeParse(raw.settings)
settings: settingsResult.success ? settingsResult.data : DEFAULT_SETTINGS
// safeParse trả về .success = false khi {} thiếu required fields → fallback đúng cách
```

Nếu muốn DB default là `null` thay vì `{}`, xóa `@default("{}")` khỏi schema — lúc đó `??` mới hoạt động đúng. Nhưng cần migration để set các row cũ.

---

## PR Checklist — Repository hydrate()

Trước khi merge PR có `hydrate()` method:

- [ ] Mọi `Json` column đều đi qua `safeParse()` — **không dùng** `as SomeType` cast trực tiếp
- [ ] Log warning khi `safeParse` fail — `this.logger.warn(...)` với `raw.id` để trace
- [ ] Fallback về DEFAULT value khi parse fail — không throw trong hydrate
- [ ] List queries dùng `select` — **không dùng** `include` trừ khi cần relation objects
- [ ] `steps` không được load trong list query nếu không cần cho UI list card

---

## Exceptions

- `auth.config.ts` is the sole permitted location for a direct `PrismaClient` instantiation, due to Better Auth's adapter requirements. This exception is documented with a comment at the instantiation site.
- `prisma.$queryRaw` is permitted for complex JSONB queries that the Prisma query builder cannot express. Each use MUST include a comment explaining why the raw query was necessary.

## Cross-Layer Consistency Notes

- Rule 02 (DTO Validation) defines Zod schemas used in the JSONB hydration step of this rule. These two rules are coupled: the `formSchemaValidator` referenced here is defined per rule 02.
- Rule 04 (Service Layering) specifies that Prisma calls belong in the Repository only -- this rule provides the patterns for those calls.
- Frontend and embed layers have no Prisma dependency. However, the shape of data that the API returns is influenced by what Prisma fetches and hydrates -- frontend types in `@flowform/types` must remain consistent with what repositories return after hydration.
