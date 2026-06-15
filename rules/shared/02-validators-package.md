# 02 - Validators Package Conventions

**Layer**: Shared (packages/validators)
**Category**: Architecture, Validation
**Severity**: Error
**Enforcement**: Manual Review, TypeScript (Zod inferred types catch schema/type drift)
**Related Rules**: rules/shared/01-types-package.md, rules/api/02-dto-validation.md, rules/frontend/05-forms.md

## Rationale

Frontend and backend share validation logic for form submissions. Without `@flowform/validators`, the same rules (min length, max length, required fields) are defined twice and drift apart -- the API accepts data the frontend didn't validate, or the frontend rejects data the API would accept. A single shared schema is the only way to guarantee that frontend and backend validation are always identical.

## Rule Definition

1. A Zod schema MUST be placed in `@flowform/validators` if it is used by 2 or more of: `apps/web`, `apps/api`, `apps/embed`.
2. Schemas used only in one app stay in that app's local validation files.
3. Every schema exported from `@flowform/validators` MUST also export its inferred TypeScript type: `export type Foo = z.infer<typeof fooSchema>`.
4. Never duplicate a Zod schema: if frontend and backend both need the same validation, it goes in `@flowform/validators` and both import from there.
5. Schemas in this package MUST NOT import from `apps/`. They may import from `@flowform/types` or other files within `packages/`.
6. The package may contain runtime code (Zod schemas are runtime), but no NestJS-specific or browser-specific code. Schemas must work in both environments.

### What belongs in @flowform/validators

- `createFormSchema` / `updateFormSchema` -- form CRUD input validation (used by web form and api controller)
- `formSchemaValidator` -- the JSONB form schema structure (used by api repository to hydrate DB data and by web form builder to validate before save)
- `createSubmissionSchema` -- response submission validation (used by embed wizard and api)
- `paginationSchema` -- pagination query params (used by web data layer and api controller)
- `presignRequestSchema` / `confirmUploadSchema` -- storage upload flow (used by web file upload and api controller)

### What does NOT belong in @flowform/validators

- Schemas that are only used in `apps/api` (e.g., internal audit log schema)
- Schemas that are only used in `apps/web` (e.g., builder UI form settings local schema)
- NestJS pipes, decorators, or dependency injection helpers

## Correct Examples

```ts
// Good: schema with exported inferred type
// packages/validators/src/form.schema.ts
import { z } from 'zod'

const fieldSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'email', 'number', 'select', 'radio', 'checkbox', 'file']),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  })).optional(),
})

const stepSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema),
  order: z.number().int().min(0),
})

export const formSchemaValidator = z.object({
  steps: z.array(stepSchema),
  settings: z.object({
    allowDraft: z.boolean().default(false),
    redirectUrl: z.string().url().optional(),
    submitButtonLabel: z.string().max(50).optional(),
  }),
})

// Always export the inferred type alongside the schema
export type FormSchemaValidated = z.infer<typeof formSchemaValidator>

export const createFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  schema: formSchemaValidator.optional(),
})

export type CreateFormDto = z.infer<typeof createFormSchema>

export const updateFormSchema = createFormSchema.partial()
export type UpdateFormDto = z.infer<typeof updateFormSchema>
```

```ts
// Good: pagination schema (used by both web and api)
// packages/validators/src/pagination.schema.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationDto = z.infer<typeof paginationSchema>
```

```ts
// Good: usage in NestJS API controller (apps/api)
// src/modules/forms/forms.controller.ts
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { createFormSchema } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

@Post()
@UseGuards(AuthGuard)
createForm(
  @Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto,
) {
  return this.formsService.createForm(dto)
}
```

```tsx
// Good: usage in React Hook Form (apps/web)
// src/components/builder/FormSettingsPanel.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFormSchema } from '@flowform/validators'
import type { CreateFormDto } from '@flowform/validators'

export function FormSettingsPanel() {
  const form = useForm<CreateFormDto>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { title: '', description: '' },
  })

  // form.register, form.handleSubmit, form.formState.errors all type-safe
}
```

```ts
// Good: index.ts re-exports all schemas and types
// packages/validators/src/index.ts
export { createFormSchema, updateFormSchema, formSchemaValidator } from './form.schema'
export type { CreateFormDto, UpdateFormDto, FormSchemaValidated } from './form.schema'
export { paginationSchema } from './pagination.schema'
export type { PaginationDto } from './pagination.schema'
export { presignRequestSchema, confirmUploadSchema } from './storage.schema'
export type { PresignRequestDto, ConfirmUploadDto } from './storage.schema'
```

## Incorrect Examples

```ts
// Bad: duplicating a schema that should be shared
// apps/web/src/lib/validations/form.ts
export const createFormSchema = z.object({  // duplicated from @flowform/validators
  title: z.string().min(1).max(200),
  description: z.string().optional(),
})
// Meanwhile apps/api has a different version with different max length
// They will drift apart
```

```ts
// Bad: schema without exported type
// packages/validators/src/form.schema.ts
export const createFormSchema = z.object({
  title: z.string().min(1),
})
// Missing: export type CreateFormDto = z.infer<typeof createFormSchema>
// Consumers must write z.infer<typeof createFormSchema> themselves and may use
// different names, breaking cross-layer terminology consistency
```

```ts
// Bad: importing from apps/ directory
// packages/validators/src/form.schema.ts
import { PrismaForm } from '../../apps/api/src/generated/prisma'  // circular dependency
```

```ts
// Bad: NestJS-specific code in shared validators package
// packages/validators/src/pipes.ts
import { PipeTransform, Injectable } from '@nestjs/common'  // NestJS -- not isomorphic

@Injectable()
export class FormValidationPipe implements PipeTransform { ... }
// This code would crash in apps/web (browser) and apps/embed (browser)
```

```ts
// Bad: schema only used in one app placed in shared package
// packages/validators/src/builder-canvas.schema.ts
export const dragDropStateSchema = z.object({
  isDragging: z.boolean(),
  draggedFieldId: z.string().optional(),
})
// Only used in apps/web builder -- keep it local to apps/web
```

## Exceptions

None. The rule "shared if used by 2+ apps, local otherwise" has no exceptions.

## Cross-Layer Consistency Notes

- Rule 02 of the API layer (`rules/api/02-dto-validation.md`) references the schemas in this package extensively. When adding a new schema here, ensure the API rule reflects it.
- Rule 05 of the frontend (`rules/frontend/05-forms.md`) references how these schemas integrate with React Hook Form via `zodResolver`. Schema shape changes affect frontend form behavior.
- The `@flowform/types` package may re-export inferred types from here to give consumers a single import path. Coordinate the two packages to avoid type duplication.
- The embed widget uses `createSubmissionSchema` for validating step data before sending to the API. Changes to this schema affect both the embed's field validation logic and the API's acceptance criteria.
