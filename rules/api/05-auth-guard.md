# 05 — Auth Guard & Ownership Check Pattern

**Layer**: Backend
**Category**: Security, Architecture
**Severity**: Error
**Enforcement**: Manual Review, TypeScript (constructor DI enforces types)
**Related Rules**: rules/api/04-service-layering.md, rules/api/06-prisma-patterns.md

## Rationale

Guards có single responsibility rõ ràng:
- `AuthGuard` — "caller là ai?" (session check only)
- `FormOwnerGuard` — "caller có quyền không?" (ownership check only)

Vi phạm phổ biến nhất là để Guard query Prisma trực tiếp thay vì đi qua Repository. Điều này tạo ra DB logic trùng lặp nằm ngoài repository layer, khó test, và khó maintain khi schema thay đổi.

## Kiến trúc guard

```
Request
   │
   ├── AuthGuard          ← Chỉ lo: "session có hợp lệ không?"
   │      └── auth.api.getSession() → attach request.user
   │
   ├── FormOwnerGuard     ← Chỉ lo: "user có sở hữu form này không?"
   │      └── formsRepository.findOwnerById() → check ownerId
   │
   └── Controller Handler (biết chắc: ai gọi + họ có quyền)
```

## Rule Definition

1. `AuthGuard` chỉ được gọi `auth.api.getSession()` và attach `request.user`. Không làm gì khác.
2. `FormOwnerGuard` phải inject **Repository** (không inject `PrismaService` trực tiếp).
3. Guard không được throw business logic exception — chỉ throw auth/authz HTTP exceptions (401, 403, 404).
4. `AuthGuard` phải chạy trước `FormOwnerGuard` — `FormOwnerGuard` giả định `request.user` đã được set.
5. Service method được gọi sau Guard không được re-query để kiểm tra existence/ownership — Guard đã xác nhận.
6. Public endpoints trả về data có status filter — không expose draft/closed forms cho anonymous callers.

---

## 1. `AuthGuard` — session check only

```ts
// ✅ — src/common/guards/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { auth } from '../../modules/auth/auth.config'
import type { SessionUser } from '../types/session.types'

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    const session = await auth.api.getSession({
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : (v ?? ''),
        ])
      ),
    })

    if (!session?.user) {
      throw new UnauthorizedException({
        type: 'https://flowform.dev/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        detail: 'You must be signed in to access this resource.',
      })
    }

    ;(request as Request & { user: SessionUser }).user = session.user as SessionUser
    return true
  }
}
```

---

## 2. `FormOwnerGuard` — inject Repository, không inject PrismaService

```ts
// ✅ — src/modules/forms/guards/form-owner.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { FormsRepository } from '../forms.repository'

@Injectable()
export class FormOwnerGuard implements CanActivate {
  constructor(private readonly formsRepository: FormsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const formId = request.params['id']
    const userId = request.user?.id

    const form = await this.formsRepository.findOwnerById(formId)

    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${formId}' does not exist.`,
      })
    }

    if (form.ownerId !== userId) {
      throw new ForbiddenException({
        type: 'https://flowform.dev/errors/forbidden',
        title: 'Access Denied',
        status: 403,
        detail: 'You do not have permission to modify this form.',
      })
    }

    return true
  }
}
```

```ts
// ✅ — FormsRepository cung cấp method nhỏ cho Guard dùng
// src/modules/forms/forms.repository.ts

async findOwnerById(id: string): Promise<{ ownerId: string } | null> {
  return this.prisma.form.findUnique({
    where: { id },
    select: { ownerId: true },  // chỉ fetch field cần thiết — 1 column
  })
}
```

```ts
// ❌ — Guard inject PrismaService trực tiếp — vi phạm layering
@Injectable()
export class FormOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}  // ❌

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const form = await this.prisma.form.findUnique(...)  // ❌ raw Prisma trong Guard
  }
}
```

---

## 3. Không re-query sau Guard — rule "one query per operation"

Khi Guard đã xác nhận existence và ownership, Service không được query lại.

```ts
// ✅ — Service.deleteForm tin tưởng Guard đã xác nhận
async deleteForm(id: string): Promise<void> {
  // FormOwnerGuard đã verify: form exists + user owns it
  await this.formsRepository.delete(id)
  this.logger.log(`Form deleted: ${id}`)
}
```

```ts
// ❌ — Service re-query sau khi Guard đã kiểm tra → 3 DB queries cho 1 DELETE
async deleteForm(id: string): Promise<void> {
  await this.getFormOrThrow(id)  // ❌ query thừa — Guard đã verify ở Query 1
  await this.formsRepository.delete(id)
}
```

**Trace DELETE với anti-pattern:**
```
FormOwnerGuard → prisma.form.findUnique()  ← Query 1 (verify exists + owner)
Service.deleteForm → getFormOrThrow        ← Query 2 (lặp lại Query 1 vô ích)
Repository.delete → prisma.form.delete     ← Query 3 (actual delete)
```

**Trace DELETE đúng:**
```
FormOwnerGuard → repo.findOwnerById()      ← Query 1 (verify exists + owner)
Repository.delete → prisma.form.delete     ← Query 2 (actual delete)
```

---

## 4. Thứ tự guards — bắt buộc

```ts
// ✅ — AuthGuard PHẢI đứng trước FormOwnerGuard
@Delete(':id')
@UseGuards(AuthGuard, FormOwnerGuard)  // thứ tự quan trọng — NestJS chạy từ trái sang phải
@HttpCode(HttpStatus.NO_CONTENT)
async deleteForm(@Param('id') id: string) {
  await this.formsService.deleteForm(id)
}
```

```ts
// ❌ — Sai thứ tự: FormOwnerGuard chạy khi chưa có request.user
@Delete(':id')
@UseGuards(FormOwnerGuard, AuthGuard)  // ❌ FormOwnerGuard đọc request.user → undefined → crash
```

---

## 5. Public endpoints — filter theo status

Public endpoints không được expose draft/closed forms.

```ts
// ✅ — Public route: chỉ trả về published forms
@Get(':id')
getPublicForm(@Param('id') id: string) {
  return this.formsService.getPublishedFormOrThrow(id)
}
```

```ts
// ✅ — Repository method có status filter
async findPublishedById(id: string): Promise<FormSchema | null> {
  const row = await this.prisma.form.findUnique({
    where: { id, status: 'published' },  // ← chỉ published mới qua
    include: { _count: { select: { responses: true } } },
  })
  return row ? this.hydrate(row) : null
}
```

```ts
// ✅ — Service method trả 404 cho cả "không tồn tại" và "không published"
async getPublishedFormOrThrow(id: string): Promise<FormSchema> {
  const form = await this.formsRepository.findPublishedById(id)
  if (!form) {
    throw new NotFoundException({
      type: 'https://flowform.dev/errors/not-found',
      title: 'Form Not Found',
      status: 404,
      detail: `Form '${id}' does not exist or is not published.`,
      // Cố ý không phân biệt "không tồn tại" và "chưa published"
      // để tránh leak thông tin về draft forms của user khác
    })
  }
  return form
}
```

```ts
// ❌ — Public endpoint không filter status → expose draft forms
@Get(':id')
getForm(@Param('id') id: string) {
  return this.formsService.getFormOrThrow(id)  // ❌ trả về draft cho anonymous caller
}
```

---

## 6. `@CurrentUser()` decorator

```ts
// ✅ — src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { SessionUser } from '../types/session.types'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: SessionUser }>()
    return request.user
  }
)
```

```ts
// ✅ — Dùng trong controller
@Post()
@UseGuards(AuthGuard)
createForm(
  @CurrentUser() user: SessionUser,
  @Body(new ZodValidationPipe(createFormDraftSchema)) dto: CreateFormDraftDto,
) {
  return this.formsService.createForm(user.id, dto)
}
```

```ts
// ❌ — Đọc user từ request thủ công
async createForm(@Req() req: any) {
  const userId = req.user?.id  // ❌ type unsafe, lặp lại pattern nhiều chỗ
}
```

---

## 7. SessionUser type

```ts
// ✅ — src/common/types/session.types.ts
export interface SessionUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
}

declare module 'express' {
  interface Request {
    user?: SessionUser
  }
}
```

---

## 8. Guard cho từng module — pattern nhất quán

Mỗi resource module có guard riêng trong `guards/` subfolder:

```
src/modules/forms/guards/form-owner.guard.ts        ← check form.ownerId
src/modules/responses/guards/form-access.guard.ts   ← check form tồn tại + published
src/common/guards/auth.guard.ts                     ← global, dùng mọi nơi
```

Guard của module **không** inject PrismaService — phải inject Repository của chính module đó.

---

## 11. AuthGuard + FormOwnerGuard bắt buộc cho mọi endpoint trả về user-scoped data

**Bối cảnh phát hiện:** `GET /api/forms/:formId/responses` chỉ có `@UseGuards(AuthGuard)` — bất kỳ user đã đăng nhập đều xem được responses của người khác nếu biết formId.

Mọi endpoint trả về dữ liệu thuộc về một user cụ thể (responses, analytics, settings, exports...) **phải dùng cả hai guard**, không chỉ `AuthGuard`.

```ts
// ✅ — Responses endpoint: check cả session + ownership
@Get()
@UseGuards(AuthGuard, FormOwnerGuard)
findAll(@Param('formId') formId: string) {
  return this.responsesService.findAll(formId)
}

// ✅ — Analytics endpoint: tương tự
@Get('analytics')
@UseGuards(AuthGuard, FormOwnerGuard)
getAnalytics(@Param('formId') formId: string) {
  return this.analyticsService.getByForm(formId)
}
```

```ts
// ❌ — Chỉ check đăng nhập, không check ownership → IDOR vulnerability
@Get()
@UseGuards(AuthGuard)
findAll(@Param('formId') formId: string) { ... }
// User B có thể xem responses của User A nếu biết formId
```

**Nguyên tắc phân loại:**

| Endpoint type | Guard yêu cầu |
|---|---|
| Public (không cần auth) | Không guard, nhưng phải filter `status: 'published'` |
| Đã đăng nhập, không liên quan form cụ thể | `AuthGuard` only |
| Trả về data của 1 form cụ thể | `AuthGuard + FormOwnerGuard` — bắt buộc |

---

## 12. `FormOwnerGuard` phải đọc `params['id'] ?? params['formId']`

`FormOwnerGuard` hiện đọc `request.params['id']`. Tuy nhiên, các module khác (responses, analytics) nest route dưới `forms/:formId` — param name là `formId`, không phải `id`.

Guard phải hỗ trợ cả hai để hoạt động nhất quán cross-module:

```ts
// ✅ — src/modules/forms/guards/form-owner.guard.ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<Request>()
  // Hỗ trợ cả :id (forms module) và :formId (responses, analytics modules)
  const formId = (request.params['id'] ?? request.params['formId']) as string
  const userId = request.user?.id

  const form = await this.formsRepository.findOwnerById(formId)
  // ...
}
```

```ts
// ❌ — Chỉ đọc params['id'] → undefined khi route dùng :formId
async canActivate(context: ExecutionContext): Promise<boolean> {
  const formId = request.params['id']  // ❌ undefined với /forms/:formId/responses
  // findOwnerById(undefined) → trả null → throw NotFoundException sai
}
```

**Route param mapping:**

| Module | Route | Param cần đọc |
|---|---|---|
| `FormsController` | `/forms/:id` | `params['id']` |
| `ResponsesController` | `/forms/:formId/responses` | `params['formId']` |
| `AnalyticsController` | `/forms/:formId/analytics` | `params['formId']` |

---

## 9. Không tạo NestJS controller cho Better Auth routes

```ts
// ✅ — src/main.ts — Better Auth mount ở middleware
app.use('/api/auth/*', toNodeHandler(auth))
// Better Auth nhận toàn bộ /api/auth/* trước khi NestJS xử lý
```

```ts
// ❌ — Tạo NestJS controller cho /api/auth/*
@Controller('auth')
export class AuthController {
  @Post('sign-in')
  signIn() { ... }  // ❌ Better Auth đã handle này
}
```

---

## 10. Không dùng global ValidationPipe (class-validator)

FlowForm dùng Zod cho tất cả validation. `ValidationPipe` của NestJS dùng class-validator decorators — không compatible với Zod strategy.

```ts
// ❌ — main.ts
app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
// ❌ Dead code — DTOs không có class-validator decorators
// ❌ `whitelist: true` strips unknown fields TRƯỚC khi ZodValidationPipe nhận — gây bug bất ngờ
```

```ts
// ✅ — Không có global ValidationPipe. ZodValidationPipe được apply per-endpoint:
@Body(new ZodValidationPipe(createFormDraftSchema)) dto: CreateFormDraftDto
```

---

## PR Checklist — Guard

Trước khi merge bất kỳ PR nào có Guard mới:

- [ ] Guard inject **Repository** (không inject `PrismaService` trực tiếp)
- [ ] Guard chỉ throw 401/403/404 — không throw 400 hoặc 500
- [ ] `AuthGuard` đứng trước `FormOwnerGuard` trong `@UseGuards(...)`
- [ ] Service method sau Guard **không** re-query để kiểm tra existence
- [ ] Public endpoint có status filter (`status: 'published'`) — không trả draft
- [ ] Mọi endpoint trả về user-scoped data (responses, analytics, settings) dùng **cả hai** `AuthGuard + FormOwnerGuard`, không chỉ `AuthGuard`
- [ ] `FormOwnerGuard` đọc `params['id'] ?? params['formId']` — không hardcode một tên param

## Exceptions

Không có exception. Guard luôn phải đi qua Repository.

---

## Rate limiting — ThrottlerGuard PHẢI đăng ký global mới có tác dụng

`ThrottlerModule.forRoot([...])` trong `app.module` **chỉ cấu hình**, không enforce. Phải
đăng ký `ThrottlerGuard` làm global guard:

```ts
// app.module.ts
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

- **Endpoint công khai/ẩn danh** (submit response, draft, public form) → siết chặt hơn
  default bằng `@Throttle({ default: { limit, ttl } })`. Route nội bộ tần suất cao →
  `@SkipThrottle()`.
- **Trust proxy**: deploy sau reverse proxy (Render) → `main.ts` phải
  `app.getHttpAdapter().getInstance().set('trust proxy', 1)`, nếu không mọi request chung
  1 IP proxy → rate-limit sai toàn cục.
- Khớp ràng buộc "no Redis": Throttler mặc định lưu **in-memory**.

- [ ] `ThrottlerGuard` đã đăng ký qua `APP_GUARD` (không chỉ `forRoot`)
- [ ] Endpoint ẩn danh có `@Throttle` riêng; `trust proxy` đã bật khi sau proxy
