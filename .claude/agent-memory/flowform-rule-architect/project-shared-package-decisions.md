---
name: shared-package-decisions
description: Decisions for @flowform/types and @flowform/validators packages: placement rules, export conventions, cross-layer consistency
metadata:
  type: project
---

Key decisions established for shared packages (rules/shared/):

**Placement rule**: "Used by 2+ apps => shared package; used by 1 app => local to that app." No exceptions. Do not move types/schemas to shared prematurely.

**@flowform/types**:
- TypeScript type and interface declarations ONLY
- No runtime code (no functions, no constants, no Zod schemas)
- No imports from apps/ directories
- All exports are named exports (no default export)
- What belongs: FormSchema, FormStep, FormField, FieldType, FormSettings, SubmissionResponse, AnalyticsEvent, SessionUser, FileAttachment
- What does NOT belong: builder-internal state types (web only), NestJS decorators, DTO classes

**@flowform/validators**:
- Zod schemas + inferred TypeScript types exported alongside
- Every schema MUST have a co-exported type: `export type Foo = z.infer<typeof fooSchema>`
- No NestJS-specific or browser-specific code (must be isomorphic)
- No imports from apps/
- Current schemas: createFormSchema, updateFormSchema, formSchemaValidator, paginationSchema, presignRequestSchema, confirmUploadSchema, createSubmissionSchema

**Terminology consistency across layers**:
- The type exported from @flowform/validators for creating a form is `CreateFormDto`
- The type for pagination is `PaginationDto`
- These names are used in both API controller params and web form types -- do not rename

**Why**: Duplicate validation logic drifts. A change to max title length that only reaches the API but not the frontend (or vice versa) is a silent bug that only surfaces in production.

**How to apply**: When adding a new form field type or changing validation constraints, update @flowform/validators first. The TypeScript errors across apps/web and apps/api will guide the remaining changes.

See [[embed-architecture-decisions]] for embed's use of shared packages.
