# 01 - Types Package Conventions

**Layer**: Shared (packages/types)
**Category**: Architecture, Naming
**Severity**: Error
**Enforcement**: Manual Review, TypeScript (importing runtime code from @flowform/types causes compile error if only types exported)
**Related Rules**: rules/shared/02-validators-package.md

## Rationale

`@flowform/types` is the single source of truth for TypeScript types shared across the monorepo. Without this rule, the same shape is defined independently in the frontend, backend, and embed -- they drift out of sync, and a change to the API response format requires hunting down and updating duplicate type definitions in multiple apps. Centralizing type definitions eliminates this drift.

## Rule Definition

1. A type MUST be placed in `@flowform/types` if it is used by 2 or more of: `apps/web`, `apps/api`, `apps/embed`.
2. A type used only in one app stays in that app's local `types/` directory. Do not move it to shared prematurely.
3. `@flowform/types` contains ONLY TypeScript `type` and `interface` declarations -- no runtime code, no functions, no classes, no constants.
4. Zod schemas belong in `@flowform/validators`, not here. Do not put Zod schemas in `@flowform/types`.
5. No imports from `apps/` -- only from other packages within `packages/` or from TypeScript built-ins.
6. All exports from `@flowform/types` must be named exports, not default exports.

### What belongs in @flowform/types

- `FormSchema` -- the full form structure (steps, fields, settings)
- `FormStep` -- a single wizard step
- `FormField` -- a single field definition (type, label, validation rules)
- `SubmissionResponse` -- what the API returns after a form submission
- `AnalyticsEvent` -- event shape for analytics tracking
- `SessionUser` -- the authenticated user shape (used by both web and api)
- `FileAttachment` -- the shape returned after confirming an upload

### What does NOT belong in @flowform/types

- Builder-specific internal state types (only used in `apps/web`)
- NestJS-specific types (`Injectable`, `Controller` decorators) -- those are app-local
- Request/response DTO types that are only used in `apps/api` -- keep them local to the module

## Correct Examples

```ts
// Good: FormSchema and related types -- used by web, api, and embed
// packages/types/src/form.ts

export interface FormSchema {
  id: string
  title: string
  description: string | null
  steps: FormStep[]
  settings: FormSettings
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface FormStep {
  id: string
  title: string
  description?: string
  fields: FormField[]
  order: number
}

export type FieldType = 'text' | 'email' | 'number' | 'select' | 'radio' | 'checkbox' | 'file'

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: { label: string; value: string }[]
}

export interface FormSettings {
  allowDraft: boolean
  redirectUrl?: string
  submitButtonLabel?: string
}
```

```ts
// Good: SubmissionResponse -- used by both web (show success) and api (return from POST)
// packages/types/src/submission.ts

export interface SubmissionResponse {
  id: string
  formId: string
  data: Record<string, unknown>
  isDraft: boolean
  submittedAt: string | null
  createdAt: string
}
```

```ts
// Good: importing shared types in different layers
// apps/web/src/components/form-engine/WizardStep.tsx
import type { FormStep, FormField } from '@flowform/types'

// apps/api/src/modules/forms/forms.repository.ts
import type { FormSchema } from '@flowform/types'

// apps/embed/src/App.tsx
import type { FormSchema } from '@flowform/types'
```

```ts
// Good: package.json for @flowform/types -- no runtime dependencies
// packages/types/package.json
{
  "name": "@flowform/types",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {}
}
```

```ts
// Good: index.ts re-exports all types
// packages/types/src/index.ts
export type { FormSchema, FormStep, FormField, FieldType, FormSettings } from './form'
export type { SubmissionResponse } from './submission'
export type { AnalyticsEvent } from './analytics'
export type { SessionUser } from './auth'
export type { FileAttachment } from './storage'
```

## Incorrect Examples

```ts
// Bad: runtime code in @flowform/types
// packages/types/src/form.ts
export interface FormSchema { ... }

export function isPublishedForm(form: FormSchema): boolean {
  return form.isPublished  // runtime function -- does not belong here
}

export const DEFAULT_SETTINGS: FormSettings = {
  allowDraft: false,  // runtime constant -- does not belong here
}
```

```ts
// Bad: Zod schema in @flowform/types (belongs in @flowform/validators)
import { z } from 'zod'

export const formStepSchema = z.object({  // runtime code -- wrong package
  id: z.string().uuid(),
  title: z.string(),
})

export type FormStep = z.infer<typeof formStepSchema>
```

```ts
// Bad: type used only in one app placed in shared package
// packages/types/src/builder-internal.ts
export interface DragHandle {
  stepId: string
  fieldId: string
  isDragging: boolean
}
// This type is only ever used in apps/web's builder -- keep it local to apps/web
```

```ts
// Bad: importing from apps/ directory
// packages/types/src/form.ts
import type { PrismaForm } from '../../apps/api/src/prisma/types'  // circular dependency
```

```ts
// Bad: default export
// packages/types/src/form.ts
export default interface FormSchema { ... }  // use named export instead
```

## Exceptions

None. If a type is genuinely used by only one app, it must stay in that app.

## Cross-Layer Consistency Notes

- `@flowform/validators` (rule 02) exports Zod schemas that infer types. When a schema is in `@flowform/validators`, the inferred type should be exported from that same file, not duplicated in `@flowform/types`. For types that have a corresponding Zod schema, `@flowform/types` can re-export from the inferred type.
- When the API changes a response field name (e.g., renames `step.title` to `step.name`), the type in `@flowform/types` must be updated, which will cause TypeScript errors in all consuming apps simultaneously -- this is the desired catch.
- The embed widget depends on `FormSchema` from this package for rendering. Changes to `FormSchema` that affect rendered fields are breaking changes for the embed's public API contract (see `rules/embed/04-public-api-contract.md`).
