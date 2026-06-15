# 01 — Module Structure & File Naming

## Cấu trúc thư mục chuẩn

Mỗi tính năng được tổ chức thành một **module NestJS** riêng dưới `src/modules/`. Cấu trúc này áp dụng thống nhất cho tất cả module.

```
src/modules/forms/
├── forms.module.ts          ← @Module() decorator, khai báo imports/providers/controllers
├── forms.controller.ts      ← HTTP routing, guards, DTO binding
├── forms.service.ts         ← Business logic (command + query handlers)
├── forms.repository.ts      ← Tất cả Prisma calls — tách biệt với service
├── dto/
│   ├── create-form.dto.ts   ← DTO cho POST body
│   ├── update-form.dto.ts   ← DTO cho PATCH body
│   └── form-response.dto.ts ← Shape của response trả về client
└── guards/
    └── form-owner.guard.ts  ← Guard kiểm tra ownership của resource
```

---

## 1. Quy tắc đặt tên file

### Module files → `kebab-case.role.ts`

```
forms.module.ts          ✅
forms.controller.ts      ✅
forms.service.ts         ✅
forms.repository.ts      ✅
FormsModule.ts           ❌  — PascalCase không dùng cho file
forms_module.ts          ❌  — snake_case không dùng
FormsController.ts       ❌
```

### DTO files → `kebab-case.dto.ts`

```
dto/create-form.dto.ts       ✅
dto/update-form.dto.ts       ✅
dto/form-response.dto.ts     ✅
dto/CreateFormDto.ts         ❌
dto/create_form_dto.ts       ❌
```

### Guard files → `kebab-case.guard.ts`

```
guards/form-owner.guard.ts   ✅
guards/auth.guard.ts         ✅
guards/FormOwnerGuard.ts     ❌
```

### Class names → PascalCase với suffix rõ ràng

```ts
// ✅
export class FormsModule {}
export class FormsController {}
export class FormsService {}
export class FormsRepository {}
export class CreateFormDto {}
export class FormOwnerGuard {}

// ❌
export class Forms {}          // thiếu suffix — không rõ role
export class FormService {}    // singular/plural không nhất quán với module
```

---

## 2. Kết nối giữa các file trong module

### `forms.module.ts` — khai báo đầy đủ

```ts
// ✅ — src/modules/forms/forms.module.ts
import { Module } from '@nestjs/common'
import { FormsController } from './forms.controller'
import { FormsService } from './forms.service'
import { FormsRepository } from './forms.repository'

@Module({
  controllers: [FormsController],
  providers: [FormsService, FormsRepository],
  exports: [FormsService], // chỉ export nếu module khác cần dùng
})
export class FormsModule {}
```

```ts
// ❌ — Instantiate trực tiếp, không qua DI
const service = new FormsService(new PrismaService()) // ❌ bypass DI container
```

### `app.module.ts` — root module import tất cả

```ts
// ✅ — src/app.module.ts
import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { FormsModule } from './modules/forms/forms.module'
import { ResponsesModule } from './modules/responses/responses.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { StorageModule } from './modules/storage/storage.module'
import { JobsModule } from './modules/jobs/jobs.module'

@Module({
  imports: [
    PrismaModule,   // @Global() — inject PrismaService mọi nơi không cần import lại
    FormsModule,
    ResponsesModule,
    AnalyticsModule,
    StorageModule,
    JobsModule,
  ],
})
export class AppModule {}
```

---

## 3. CQRS light — phân tách Command và Query trong Service

FlowForm dùng **CQRS light**: không dùng NestJS CQRS module, nhưng logic được phân tách rõ ràng trong service thành Command methods và Query methods.

```ts
// ✅ — src/modules/forms/forms.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { FormsRepository } from './forms.repository'
import { CreateFormDto } from './dto/create-form.dto'
import { UpdateFormDto } from './dto/update-form.dto'

@Injectable()
export class FormsService {
  constructor(private readonly formsRepository: FormsRepository) {}

  // === QUERY (read, không side effect) ===

  async getFormById(id: string) {
    const form = await this.formsRepository.findById(id)
    if (!form) throw new NotFoundException(`Form ${id} not found`)
    return form
  }

  async getFormsByOwner(ownerId: string) {
    return this.formsRepository.findByOwner(ownerId)
  }

  // === COMMAND (write, có side effect) ===

  async createForm(ownerId: string, dto: CreateFormDto) {
    return this.formsRepository.create(ownerId, dto)
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    await this.getFormById(id) // reuse query — throw 404 nếu không tồn tại
    return this.formsRepository.update(id, dto)
  }

  async deleteForm(id: string) {
    await this.getFormById(id)
    return this.formsRepository.delete(id)
  }
}
```

```ts
// ❌ — Gọi Prisma trực tiếp trong Service (bỏ qua Repository layer)
@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {} // ❌

  async getFormById(id: string) {
    return this.prisma.form.findUnique({ where: { id } }) // ❌ — logic này thuộc Repository
  }
}
```

---

## 4. Module cho global concerns

### `PrismaModule` — `@Global()`, không import lại

```ts
// ✅ — src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Vì `PrismaModule` là `@Global()`, các module khác **không** cần import nó — chỉ cần inject `PrismaService` trong constructor.

```ts
// ✅ — FormsRepository inject PrismaService mà không cần import PrismaModule
@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}
}

// ❌ — Import PrismaModule thừa
@Module({
  imports: [PrismaModule], // ❌ không cần thiết vì đã @Global()
})
export class FormsModule {}
```

---

## 5. Module mới — checklist

Khi tạo module mới, đảm bảo đủ 4 bước:

```
1. Tạo thư mục:  src/modules/[name]/
2. Tạo files:    [name].module.ts, [name].controller.ts, [name].service.ts, [name].repository.ts
3. Đăng ký:      Import [NameModule] vào app.module.ts
4. DTO:          Tạo dto/ subfolder với create, update, response DTOs
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Business logic trong Controller
@Post()
async createForm(@Body() body: CreateFormDto, @Request() req) {
  const schema = validateFormSchemaWithZod(body.schema) // ❌ validate logic trong controller
  const form = await this.prisma.form.create({ ... })   // ❌ DB call trong controller
  return form
}
```

```ts
// ❌ — Prisma call trong Service (vượt qua Repository)
@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}
  async listForms(ownerId: string) {
    return this.prisma.form.findMany({ where: { ownerId } }) // ❌
  }
}
```

```ts
// ❌ — Tạo instance mới trong module
@Module({
  providers: [
    { provide: FormsService, useValue: new FormsService() } // ❌ bypass DI
  ]
})
```
