# FlowForm -- @flowform/types

## MỤC ĐÍCH

Package này chứa **TypeScript type và interface declarations được chia sẻ** giữa `apps/web`, `apps/api`, và `apps/embed`.

Đây là nơi duy nhất định nghĩa shape của dữ liệu dùng chung -- không có runtime code, không có Zod schemas, không có logic xử lý.

---

## QUY TẮC CĂN BẢN

### Một type thuộc về đây khi:
- Được dùng bởi 2 hoặc nhiều hơn trong số: `apps/web`, `apps/api`, `apps/embed`
- Là shape của dữ liệu trao đổi giữa các layer (API response, form schema, analytics event)

### Một type KHÔNG thuộc về đây khi:
- Chỉ dùng trong 1 app -- giữ nguyên trong app đó
- Là Zod schema -- đặt trong `@flowform/validators`
- Là runtime code (function, class, constant) -- package này chỉ có type declarations

### Package này KHÔNG được import từ:
- `apps/` (sẽ tạo circular dependency)
- NestJS packages
- React/Preact packages
- Bất kỳ package nào có runtime side effect

---

## NHỮNG GÌ THUỘC VỀ ĐÂY

```
packages/types/src/
├── form.ts          -- FormSchema, FormStep, FormField, FieldType, FormSettings
├── submission.ts    -- SubmissionResponse
├── analytics.ts     -- AnalyticsEvent
├── auth.ts          -- SessionUser
├── storage.ts       -- FileAttachment
└── index.ts         -- re-export tất cả
```

---

## RULES

- [`../../rules/shared/01-types-package.md`](../../rules/shared/01-types-package.md) -- Khi nào đặt type vào đây, khi nào giữ local, định dạng exports, những gì bị cấm

---

## LỆNH

```bash
# Type-check
cd packages/types && npm run typecheck

# Build (emit .d.ts files)
cd packages/types && npm run build
```

---

## LƯU Ý

Khi thay đổi một type ở đây, TypeScript sẽ báo lỗi ngay lập tức tại mọi nơi sử dụng type đó trên toàn monorepo. Đây là behavior mong muốn -- nó bắt được những thay đổi breaking trước khi deploy.

Khi rename một field (ví dụ `step.title` thành `step.name`), phải cập nhật:
1. Type definition ở đây
2. API response mapping trong `apps/api`
3. Component props trong `apps/web`
4. Render logic trong `apps/embed`
5. embed public API contract -- xem `rules/embed/04-public-api-contract.md`
