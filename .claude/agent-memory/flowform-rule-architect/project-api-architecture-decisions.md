---
name: project-api-architecture-decisions
description: API layer architecture decisions established during the first rule-writing session (June 2026) — CQRS, validation, error format, R2, TypeScript exceptions
metadata:
  type: project
---

Key architecture decisions locked in for `apps/api/` (NestJS backend). These decisions are now encoded in `rules/api/01–05`.

**Architecture pattern:** CQRS light — no NestJS CQRS module. Command and Query methods are separated within the same Service class using `// === QUERY ===` and `// === COMMAND ===` section comments.

**Why:** Single-developer indie SaaS. Full CQRS would add complexity without benefit at this scale.

**DTO validation:** Zod schemas from `@flowform/validators` (shared with frontend) + custom `ZodValidationPipe`. No `class-validator`. DTOs are plain TypeScript classes (type carriers only).

**Why:** One source of truth for validation. Frontend and backend cannot drift apart on field rules.

**Error format:** RFC 7807 Problem Details (`type`, `title`, `status`, `detail`). Global `HttpExceptionFilter` converts all `HttpException` to this format. `type` URIs use pattern `https://flowform.dev/errors/[slug]`.

**Why:** Consistent, parseable error format for the frontend to handle without checking error message strings.

**R2 presigned URL defaults:**
- Max file size: 10MB (enforced via `ContentLengthRange` in presigned URL, not just frontend)
- URL expiry: 15 minutes
- DB record saved **after upload confirmed** (not when URL generated) — table `file_attachments(id, form_id, r2_key, filename, size_bytes, mime_type, uploaded_by, created_at)`
- Flow: client requests URL → server returns URL + fileKey → client uploads to R2 → client POSTs confirm endpoint → server inserts DB record

**Why:** DB only has records of files that actually exist in R2. Pre-insert would leave orphan records for failed uploads. 10MB covers images/PDFs without exhausting R2 free tier (10GB total).

**TypeScript strictness exceptions (backend vs frontend):**
- `any` permitted for: (1) Prisma `Json` column reads — must be immediately narrowed via Zod in same function; (2) pg-boss job handler parameter (library doesn't export usable generic type). Both require explanatory comment.
- NestJS controller handler methods are exempt from mandatory explicit return type annotations (serialization is handled by NestJS).
- All other `strict: true` rules identical to frontend.

**Auth guard ordering:** `@UseGuards(AuthGuard, FormOwnerGuard)` — AuthGuard MUST run first to attach `request.user` before FormOwnerGuard reads it.

**Rate limiting:** NestJS Throttler with MemoryStorage (no Redis). Resets on restart — accepted trade-off for free tier. TODO comment left in code to document the known limitation.

**Analytics events:** Inserted directly in request handler — no buffering, no pg-boss for this path. pg-boss is only for CSV export jobs.

**How to apply:** When adding new modules or endpoints, verify they follow the patterns in rules/api/01–05. When a rule seems to conflict with a new requirement, check these decisions first before deviating.

Related: [[project-flowform-no-redis-constraint]]
