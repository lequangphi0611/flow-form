---
name: plan-api
description: >
  Generate a detailed NestJS/Prisma implementation plan for an api-layer sub-story,
  present it for approval, then implement after confirmation. Use for US-{id}{letter}
  tasks where layer=api. Invoke with /plan-api US-004a, or when implementing an
  api-layer task from a /breakdown output.
---

# /plan-api — API Implementation Plan

**Input:** sub-story ID — ví dụ `/plan-api US-004a`
**Flow:** Read story → load API rules → gen plan → approve gate → implement

---

## Step 1 — Đọc story

Tìm file `po-requests/sprint-*/US-{id}*.md`. Nếu không có file, dùng mô tả từ chat.

Đọc kỹ:
- Acceptance Criteria (chỉ phần liên quan đến layer `api`)
- Technical Notes (endpoints, guards, Prisma changes)
- `depends_on` frontmatter — kiểm tra task dependency đã xong chưa

## Step 2 — Load rules liên quan

Trước khi viết plan, đọc **bắt buộc**:
1. `apps/api/CLAUDE.md` — stack, cấu trúc module, quy tắc quan trọng của layer này
2. Các rule cụ thể bên dưới **nếu chưa đọc trong session này**:

| Rule | Đọc khi |
|---|---|
| `rules/api/01-module-structure.md` | Tạo file mới trong module |
| `rules/api/02-dto-validation.md` | Có endpoint nhận body |
| `rules/api/03-error-handling.md` | Throw exception hoặc handle Prisma error |
| `rules/api/04-service-layering.md` | Mọi task API (luôn đọc) |
| `rules/api/05-auth-guard.md` | Endpoint cần auth hoặc ownership check |
| `rules/api/06-prisma-patterns.md` | Có query Prisma mới |
| `rules/shared/03-clean-code.md` | Mọi task (luôn đọc) |

## Step 3 — Tạo implementation plan

Format chuẩn — in ra chat:

```
## Plan: {US-id} — {Tên ngắn}

### Files to create
- `path/to/file.ts` — [mô tả ngắn làm gì]

### Files to modify
- `path/to/file.ts` — [thêm/sửa gì cụ thể]

### Endpoint(s)
- `METHOD /api/path` — [mô tả, guard chain, DTO]
  Guard chain: AuthGuard → FormOwnerGuard → ZodValidationPipe(schema)

### Prisma changes
- [migration mới / chỉ update query / không có]

### Validators / shared types
- [schema mới trong packages/validators hoặc packages/types nếu cần]

### Checklist
- [ ] Controller chỉ nhận/trả DTO, không chứa business logic
- [ ] Service orchestrate, Repository xử lý DB
- [ ] Guard inject Repository, không inject PrismaService trực tiếp
- [ ] ZodValidationPipe trên mọi endpoint có @Body
- [ ] Không có `any` cast
- [ ] Không có `console.log`
```

## Step 4 — Approval gate (BẮT BUỘC)

Sau khi in plan, dùng `AskUserQuestion`:

```
AskUserQuestion({
  questions: [{
    question: "Plan trên có ổn không?",
    header: "Approve plan",
    options: [
      { label: "Approve — implement ngay",  description: "Bắt đầu viết code theo plan" },
      { label: "Revise — cần điều chỉnh",   description: "Mô tả thay đổi trong notes" },
    ],
    multiSelect: false
  }]
})
```

- **Approve** → chuyển sang Step 5
- **Revise** → cập nhật plan theo feedback, hỏi lại

## Step 5 — Implement

Thực hiện đúng theo plan đã approve:
1. Tạo/sửa files theo thứ tự dependency (types/validators trước, repository → service → controller sau)
2. Chạy `git add` và `git commit` theo convention: `feat(api): ...` hoặc `fix(api): ...`
3. Báo cáo ngắn: file đã tạo/sửa + commit hash
