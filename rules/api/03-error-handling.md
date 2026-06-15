# 03 — Error Handling & HTTP Exception Format

## Chuẩn lỗi: RFC 7807 Problem Details

Tất cả lỗi HTTP từ FlowForm API trả về theo chuẩn **RFC 7807 Problem Details**. Đây là response body nhất quán cho mọi lỗi — từ validation đến authorization đến server error.

```json
{
  "type": "https://flowform.dev/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Form with id '123e4567-e89b-12d3-a456-426614174000' does not exist"
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `type` | ✅ | URI định danh loại lỗi. Dùng `https://flowform.dev/errors/[slug]` |
| `title` | ✅ | Tên lỗi ngắn gọn bằng tiếng Anh, nhất quán cho cùng `type` |
| `status` | ✅ | HTTP status code (phải khớp với response status) |
| `detail` | ✅ | Mô tả chi tiết cho lần lỗi cụ thể này (có thể chứa dynamic values) |
| `errors` | Optional | Dùng cho validation — map field → array of messages |

---

## 1. Exception Filter toàn cục — `HttpExceptionFilter`

Tạo một global exception filter để chuyển đổi mọi `HttpException` (và lỗi bất ngờ) sang Problem Details format.

```ts
// ✅ — src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number
    let body: Record<string, unknown>

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      // Nếu service đã throw với Problem Details shape, dùng luôn
      if (typeof exceptionResponse === 'object' && 'type' in exceptionResponse) {
        body = exceptionResponse as Record<string, unknown>
      } else {
        // Wrap NestJS built-in exceptions sang Problem Details
        body = {
          type: `https://flowform.dev/errors/${this.slugFromStatus(status)}`,
          title: exception.message,
          status,
          detail: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exception.message,
        }
      }
    } else {
      // Lỗi không mong đợi — log đầy đủ, trả về 500 mờ nhạt
      this.logger.error('Unhandled exception', {
        path: request.url,
        exception,
      })

      status = HttpStatus.INTERNAL_SERVER_ERROR
      body = {
        type: 'https://flowform.dev/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred. Please try again later.',
      }
    }

    response.status(status).json(body)
  }

  private slugFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'bad-request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not-found',
      409: 'conflict',
      422: 'unprocessable-entity',
      429: 'too-many-requests',
      500: 'internal-server-error',
    }
    return map[status] ?? 'unknown-error'
  }
}
```

```ts
// ✅ — src/main.ts — đăng ký global filter
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.listen(3001)
}
bootstrap()
```

---

## 2. Throw exception trong Service — sử dụng NestJS built-ins

Trong service và guard, throw các exception class của NestJS. Filter sẽ chuyển đổi chúng sang Problem Details.

```ts
// ✅ — src/modules/forms/forms.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common'
import { FormsRepository } from './forms.repository'

@Injectable()
export class FormsService {
  constructor(private readonly formsRepository: FormsRepository) {}

  async getFormById(id: string) {
    const form = await this.formsRepository.findById(id)

    if (!form) {
      throw new NotFoundException(
        `Form with id '${id}' does not exist`
      )
    }

    return form
  }

  async publishForm(id: string, ownerId: string) {
    const form = await this.getFormById(id)

    if (form.isPublished) {
      throw new ConflictException(`Form '${id}' is already published`)
    }

    return this.formsRepository.publish(id)
  }
}
```

### Exception phổ biến và khi nào dùng

| Exception | HTTP Status | Khi nào dùng |
|---|---|---|
| `NotFoundException` | 404 | Resource không tồn tại (form, response, user) |
| `UnauthorizedException` | 401 | Không có session / session hết hạn |
| `ForbiddenException` | 403 | Có session nhưng không có quyền với resource này |
| `BadRequestException` | 400 | Input sai về mặt cú pháp (không fail business rules) |
| `ConflictException` | 409 | Trạng thái không hợp lệ (đã publish, slug trùng) |
| `UnprocessableEntityException` | 422 | Fail business validation (dùng cho ZodValidationPipe) |

---

## 3. Throw với Problem Details shape trực tiếp

Khi cần trả về lỗi có thêm context (validation errors, specific error codes), throw với shape đầy đủ.

```ts
// ✅ — ZodValidationPipe throw với Problem Details đầy đủ
throw new BadRequestException({
  type: 'https://flowform.dev/errors/validation',
  title: 'Validation Failed',
  status: 400,
  detail: 'Request body failed schema validation',
  errors: result.error.flatten().fieldErrors,
  // errors example: { "title": ["Tiêu đề không được để trống"] }
})
```

```ts
// ✅ — Business rule violation với detail cụ thể
throw new UnprocessableEntityException({
  type: 'https://flowform.dev/errors/form-step-limit',
  title: 'Form Step Limit Exceeded',
  status: 422,
  detail: `Free tier allows maximum 5 steps per form. This form has ${stepCount} steps.`,
})
```

---

## 4. Không để lỗi bất ngờ leak thông tin

Server errors (5xx) phải log chi tiết nội bộ nhưng trả về thông điệp mờ nhạt cho client.

```ts
// ✅ — Trong ExceptionFilter: log đầy đủ, trả về mờ nhạt
this.logger.error('Unhandled exception', { path, exception })
// Client nhận: "An unexpected error occurred. Please try again later."

// ✅ — Trong service khi gọi external service (R2, pg-boss):
async uploadFile(key: string, buffer: Buffer) {
  try {
    await this.s3Client.send(new PutObjectCommand({ ... }))
  } catch (err) {
    this.logger.error('R2 upload failed', { key, error: err })
    throw new InternalServerErrorException(
      'File upload failed. Please try again.'
      // ❌ KHÔNG: 'R2 error: NoSuchBucket' — leak infrastructure detail
    )
  }
}
```

```ts
// ❌ — Rethrow raw error về client
catch (err) {
  throw err  // ❌ error có thể chứa stack trace, DB connection strings, etc.
}
```

---

## 5. Logging — chuẩn NestJS Logger

Dùng `Logger` từ `@nestjs/common`. Không dùng `console.log` trong production code.

```ts
// ✅ — Logger inject đúng cách
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name)

  async createForm(ownerId: string, dto: CreateFormDto) {
    this.logger.log(`Creating form for user ${ownerId}`)

    try {
      const form = await this.formsRepository.create(ownerId, dto)
      this.logger.log(`Form created: ${form.id}`)
      return form
    } catch (err) {
      this.logger.error('Failed to create form', { ownerId, error: err })
      throw new InternalServerErrorException('Failed to create form')
    }
  }
}
```

```ts
// ❌ — console.log trong service
async createForm(ownerId: string, dto: CreateFormDto) {
  console.log('Creating form...') // ❌ không có context, không thể filter log level
  return this.formsRepository.create(ownerId, dto)
}
```

---

## 6. Prisma errors — xử lý P-codes

Prisma throw `PrismaClientKnownRequestError` với error codes (`P2002`, `P2025`, v.v.). Catch tại Repository layer và convert sang NestJS exceptions.

```ts
// ✅ — src/modules/forms/forms.repository.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

@Injectable()
export class FormsRepository {
  async create(ownerId: string, dto: CreateFormDto) {
    try {
      return await this.prisma.form.create({ data: { ownerId, ...dto } })
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException('A form with this slug already exists')
        }
      }
      throw err // re-throw — ExceptionFilter sẽ handle thành 500
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.form.delete({ where: { id } })
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException(`Form '${id}' not found`)
      }
      throw err
    }
  }
}
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Throw raw Error (không phải HttpException)
throw new Error('Form not found') // ❌ filter bắt được nhưng status sẽ là 500

// ❌ — Trả về error object thay vì throw
return { error: 'Form not found', status: 404 } // ❌ HTTP status vẫn là 200

// ❌ — Nuốt lỗi im lặng
try {
  await this.formsRepository.delete(id)
} catch {
  // không làm gì ❌ — caller không biết thao tác thất bại
}

// ❌ — console.error thay vì Logger
console.error('Delete failed:', err) // ❌

// ❌ — Expose stack trace
throw new InternalServerErrorException(err.stack) // ❌ leak internals
```
