---
name: plan-embed
description: >
  Generate a detailed Vite+Preact implementation plan for an embed-layer sub-story,
  present it for approval, then implement after confirmation. Use for US-{id}{letter}
  tasks where layer=embed. Invoke with /plan-embed US-006a, or when implementing an
  embed-layer task from a /breakdown output.
---

# /plan-embed — Embed Implementation Plan

**Input:** sub-story ID — ví dụ `/plan-embed US-006a`
**Flow:** Read story → load embed rules → gen plan → approve gate → implement

---

## Step 1 — Đọc story

Tìm file `po-requests/sprint-*/US-{id}*.md`. Nếu không có file, dùng mô tả từ chat.

Đọc kỹ:
- Acceptance Criteria (chỉ phần liên quan đến layer `embed`)
- Technical Notes (component, API call, bundle impact)
- `depends_on` frontmatter — embed thường phụ thuộc vào api task

## Step 2 — Load rules liên quan

Trước khi viết plan, đọc **tất cả** rules embed (chỉ có 4, đọc hết):

| Rule | Nội dung |
|---|---|
| `rules/embed/01-bundle-constraints.md` | Hard limit 30KB gzip, dependency bị cấm |
| `rules/embed/02-css-isolation.md` | Shadow DOM hoặc flowform- prefix |
| `rules/embed/03-preact-conventions.md` | Import từ preact, functional only, useFetch |
| `rules/embed/04-public-api-contract.md` | window.FlowForm API, backward compat |
| `rules/shared/03-clean-code.md` | Mọi task (luôn đọc) |

## Step 3 — Tạo implementation plan

Format chuẩn — in ra chat:

```
## Plan: {US-id} — {Tên ngắn}

### Files to create
- `apps/embed/src/components/[Name].tsx` — [mô tả]

### Files to modify
- `apps/embed/src/App.tsx` — [thay đổi gì]

### Bundle impact estimate
- Thêm ~X KB gzip
- Tổng hiện tại: ~Y KB / 30KB limit
- [Dependency mới nào không? Có trong danh sách bị cấm không?]

### API calls
- `GET /api/forms/{formId}` — fetch form schema (dùng useFetch hook từ rule 03)
- [Không dùng TanStack Query — embed dùng useFetch riêng]

### CSS approach
- [ ] Dùng flowform- prefix cho tất cả class
- [ ] KHÔNG dùng Tailwind (không có trong embed bundle)
- [ ] Style inline hoặc CSS module scoped

### Checklist
- [ ] Import từ `preact` và `preact/hooks` — không phải `react`
- [ ] Functional component only, không class component
- [ ] Không import thư viện bị cấm (lodash, moment, axios...)
- [ ] CSS isolation: flowform- prefix hoặc Shadow DOM
- [ ] Bundle estimate trong limit 30KB gzip
- [ ] window.FlowForm API giữ backward compat nếu sửa public API
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
1. Tạo/sửa files — ưu tiên giữ bundle nhỏ, không thêm dependency mới nếu không cần
2. Chạy `git add` và `git commit` theo convention: `feat(embed): ...`
3. Báo cáo ngắn: file đã tạo/sửa + bundle estimate + commit hash
