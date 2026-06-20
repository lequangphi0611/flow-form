---
name: doc-coauthoring
description: >
  Co-author project documentation with the user — section by section with
  approval gates. Use for README, project_overview.md, sprint retrospectives,
  ADRs, onboarding guides, or any project-level doc. Invoke with
  /doc-coauthoring <topic>, e.g. /doc-coauthoring "onboarding guide for new devs".
---

# /doc-coauthoring — Co-author Project Docs

**Input:** topic hoặc file path — ví dụ `/doc-coauthoring "public form engine"` hoặc `/doc-coauthoring project_overview.md`
**Flow:** Hiểu mục tiêu → Đọc context → Đề xuất outline → Viết từng section → Finalize

---

## Step 1 — Hiểu mục tiêu

Trả lời các câu hỏi:
- Document này dành cho ai đọc? (developer mới, PO, external contributor, stakeholder)
- Đây là tài liệu mới hay cập nhật file đã có?
- Có file/folder cụ thể nào cần đọc để lấy context?

Nếu user đã cung cấp đủ thông tin trong lệnh gọi, bỏ qua bước hỏi và tiến thẳng Step 2.

---

## Step 2 — Đọc context

Tùy topic, đọc các file liên quan:

| Topic | Files cần đọc |
|---|---|
| Tổng quan project | `project_overview.md`, `CLAUDE.md`, `turbo.json` |
| Feature cụ thể | Code của feature + story file trong `po-requests/` |
| Onboarding | `CLAUDE.md` của từng app, `rules/`, `README.md` (nếu có) |
| Sprint / retrospective | `po-requests/sprint-*/` |
| API | `apps/api/src/modules/` |

Đọc đủ context trước khi đề xuất outline — không bịa thông tin không có trong codebase.

---

## Step 3 — Đề xuất outline

Output outline theo format:

```
## Outline: [Tên document]
Audience: [ai đọc]
Format: [markdown / prose / table-heavy / ...]

### Sections đề xuất
1. [Tên section] — [1 câu mô tả nội dung]
2. [Tên section] — [...]
3. ...

Ước tính: ~[N] section, [ngắn/trung bình/dài]
```

Sau đó dùng `AskUserQuestion`:

```
AskUserQuestion({
  questions: [{
    question: "Outline trên có ổn không? Bạn muốn thêm/bỏ/đổi thứ tự section nào?",
    header: "Outline",
    options: [
      { label: "Approve — viết section đầu tiên", description: "Bắt đầu co-author theo outline" },
      { label: "Điều chỉnh outline",               description: "Thêm/bỏ/đổi trước khi viết" },
    ],
    multiSelect: false
  }]
})
```

- **Approve** → Step 4
- **Điều chỉnh** → cập nhật outline, hỏi lại

---

## Step 4 — Viết từng section (approval gate sau mỗi section)

Với mỗi section trong outline:

1. **Viết** nội dung section — ngắn gọn, rõ ràng, đúng với context đã đọc. Không bịa số liệu hay tính năng chưa tồn tại.

2. **Sau mỗi section**, dùng `AskUserQuestion`:

```
AskUserQuestion({
  questions: [{
    question: "Section '[Tên]' trên ổn chưa?",
    header: "Review",
    options: [
      { label: "Approve — viết section tiếp",  description: "Tiếp tục với section kế tiếp" },
      { label: "Revise section này",            description: "Chỉnh sửa section hiện tại trước" },
      { label: "Dừng lại — tôi sẽ tự viết tiếp", description: "Kết thúc co-author session" },
    ],
    multiSelect: false
  }]
})
```

- **Approve** → section tiếp theo
- **Revise** → nhận feedback từ user, rewrite, hỏi lại
- **Dừng** → Step 5 (finalize với những gì đã có)

**Quy tắc khi viết:**
- Dùng tiếng Việt trừ khi user nói dùng tiếng Anh hoặc đây là file public-facing
- Heading rõ ràng (H2 cho section chính, H3 cho sub-section)
- Dùng bảng khi so sánh nhiều thứ, dùng list khi liệt kê bước hoặc item
- Code block cho mọi đoạn code, command, path
- Không thêm emoji trừ khi user yêu cầu

---

## Step 5 — Finalize

Sau khi toàn bộ sections được approve:

1. **Compile** toàn bộ nội dung vào 1 document hoàn chỉnh
2. **Hỏi** file path cần lưu (nếu chưa xác định ở Step 1)
3. **Write** file vào path đó
4. **Git add + commit**: `docs: add/update [tên document]`
5. **Báo cáo**: file đã lưu, commit hash

```
AskUserQuestion({
  questions: [{
    question: "Document đã hoàn chỉnh. Lưu vào file nào?",
    header: "File path",
    options: [
      { label: "project_overview.md",  description: "Root — tổng quan toàn project" },
      { label: "docs/[topic].md",      description: "Thư mục docs/ — tài liệu kỹ thuật" },
      { label: "Tôi sẽ chỉ định path", description: "Nhập path tuỳ chỉnh" },
    ],
    multiSelect: false
  }]
})
```

---

## Ví dụ gọi

```
/doc-coauthoring "hướng dẫn onboarding cho dev mới"
/doc-coauthoring project_overview.md   ← cập nhật file đã có
/doc-coauthoring "kiến trúc 3 module Builder / Engine / Analytics"
/doc-coauthoring "sprint 1 retrospective"
```
