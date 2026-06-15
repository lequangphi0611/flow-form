# 05 — Auth Guard & Ownership Check Pattern

## Kiến trúc auth

```
Request
   │
   ├── AuthGuard          ← Xác thực: có session hợp lệ không?
   │      └── Lấy session từ Better Auth
   │      └── Attach user vào request object
   │
   ├── FormOwnerGuard     ← Phân quyền: user có sở hữu resource này không?
   │      └── Đọc :id từ route params
   │      └── Query DB kiểm tra ownerId === user.id
   │
   └── Controller Handler (biết chắc user đã auth + có quyền)
```

Better Auth được mount ở `main.ts` như raw Express middleware. **Không tạo NestJS controller cho `/api/auth/*`.**

---

## 1. `AuthGuard` — xác thực session

```ts
// ✅ — src/common/guards/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { auth } from '@/modules/auth/auth.config'

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

    // Attach session vào request để handler và downstream guards có thể đọc
    ;(request as Request & { user: typeof session.user }).user = session.user

    return true
  }
}
```

---

## 2. `@CurrentUser()` decorator — đọc user trong handler

```ts
// ✅ — src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
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
  @Body(new ZodValidationPipe(createFormSchema)) dto: CreateFormDto,
) {
  return this.formsService.createForm(user.id, dto)
}
```

```ts
// ❌ — Đọc user từ request thủ công trong controller
@Post()
async createForm(@Request() req: any) {
  const userId = req.user?.id // ❌ type unsafe, lặp lại pattern nhiều chỗ
}
```

---

## 3. `FormOwnerGuard` — kiểm tra ownership

Ownership guard chạy **sau** `AuthGuard`. Giả định `request.user` đã được set. Guard query DB để xác nhận user sở hữu form.

```ts
// ✅ — src/modules/forms/guards/form-owner.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FormOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: SessionUser }>()
    const formId = request.params['id']
    const userId = request.user.id

    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: { ownerId: true }, // chỉ fetch field cần thiết
    })

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

### Thứ tự guards — bắt buộc đúng

```ts
// ✅ — AuthGuard PHẢI chạy trước FormOwnerGuard
@Patch(':id')
@UseGuards(AuthGuard, FormOwnerGuard)  // thứ tự quan trọng
updateForm(@Param('id') id: string, @Body(...) dto: UpdateFormDto) {
  return this.formsService.updateForm(id, dto)
}

// ❌ — Sai thứ tự: FormOwnerGuard chạy khi chưa có request.user
@Patch(':id')
@UseGuards(FormOwnerGuard, AuthGuard) // ❌ request.user chưa có → crash
updateForm(...) {}
```

---

## 4. Guards cho từng module — pattern nhất quán

Mỗi resource module có guard riêng trong `guards/` subfolder:

```
src/modules/forms/guards/form-owner.guard.ts        ← check form.ownerId
src/modules/responses/guards/form-access.guard.ts   ← check form tồn tại + published
src/common/guards/auth.guard.ts                     ← global, dùng mọi nơi
```

### Guard cho public endpoint (responses submit)

```ts
// ✅ — src/modules/responses/guards/form-access.guard.ts
// Dùng cho POST /api/forms/:id/responses — end-user submit, không cần auth
@Injectable()
export class FormAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const formId = request.params['id']

    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: { isPublished: true },
    })

    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${formId}' does not exist.`,
      })
    }

    if (!form.isPublished) {
      throw new ForbiddenException({
        type: 'https://flowform.dev/errors/form-not-published',
        title: 'Form Not Published',
        status: 403,
        detail: 'This form is not accepting responses.',
      })
    }

    return true
  }
}
```

---

## 5. SessionUser type — định nghĩa một lần

```ts
// ✅ — src/common/types/session.types.ts
export interface SessionUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
}

// Extend Express Request type để TypeScript hiểu request.user
declare module 'express' {
  interface Request {
    user?: SessionUser
  }
}
```

---

## 6. Không tạo controller cho Better Auth routes

Better Auth xử lý tất cả `/api/auth/*` routes ở tầng middleware. Không tạo NestJS controller cho các routes này.

```ts
// ✅ — src/main.ts — Better Auth mount ở middleware
import { toNodeHandler } from 'better-auth/node'
import { auth } from './modules/auth/auth.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Better Auth nhận toàn bộ /api/auth/* trước khi NestJS xử lý
  app.use('/api/auth/*', toNodeHandler(auth))

  app.useGlobalFilters(new HttpExceptionFilter())
  await app.listen(3001)
}
```

```ts
// ❌ — Tạo NestJS controller cho /api/auth/*
@Controller('auth')
export class AuthController {
  @Post('sign-in')
  signIn() { ... } // ❌ Better Auth đã handle này qua middleware
}
```

---

## 7. Rate limiting — NestJS Throttler (in-memory)

FlowForm dùng NestJS Throttler với `MemoryStorage`. Rate limit reset khi server restart.

```ts
// ✅ — src/app.module.ts — đăng ký ThrottlerModule
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: 60_000, limit: 60 },   // 60 requests / phút — general
      ],
    }),
    // ...các module khác
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // áp dụng global
    },
  ],
})
export class AppModule {}
```

```ts
// ✅ — Override rate limit cho specific endpoint (submit response — public)
import { Throttle } from '@nestjs/throttler'

@Post(':id/responses')
@UseGuards(FormAccessGuard)
@Throttle({ default: { ttl: 60_000, limit: 10 } }) // 10 submits / phút per IP
submitResponse(...) {}
```

**Lưu ý:** In-memory throttler reset khi Render.com restart instance. Đây là trade-off chấp nhận được cho indie SaaS free tier — không có Redis.

```
// TODO: Nếu scale lên, thay MemoryStorage bằng ThrottlerStorageRedisService
// hoặc dùng Cloudflare Rate Limiting ở tầng edge
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Check ownership trong Service thay vì Guard
async updateForm(id: string, userId: string, dto: UpdateFormDto) {
  const form = await this.getFormOrThrow(id)
  if (form.ownerId !== userId) throw new ForbiddenException() // ❌ thuộc Guard
  return this.formsRepository.update(id, dto)
}
```

```ts
// ❌ — Auth check trong Controller thay vì Guard
@Patch(':id')
async updateForm(@Request() req, @Param('id') id: string, @Body() dto: UpdateFormDto) {
  if (!req.user) throw new UnauthorizedException() // ❌ thuộc AuthGuard
  const form = await this.formsService.getFormOrThrow(id)
  if (form.ownerId !== req.user.id) throw new ForbiddenException() // ❌ thuộc FormOwnerGuard
  return this.formsService.updateForm(id, dto)
}
```

```ts
// ❌ — Skip AuthGuard trên route cần auth
@Patch(':id')
@UseGuards(FormOwnerGuard) // ❌ FormOwnerGuard cần user đã được set bởi AuthGuard
updateForm(...) {}
```

```ts
// ❌ — Lưu JWT trong cookie hoặc localStorage
// Better Auth dùng database sessions — không có JWT
// Không tạo JWT, không verify JWT thủ công
```
