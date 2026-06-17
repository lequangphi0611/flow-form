---
name: breakdown
description: >
  Break down a large user story (3+ story points) into smaller sub-stories by
  AC group then by layer (api/web/embed/shared). Map dependencies between sub-tasks
  and identify which can run in parallel. Invoke with /breakdown US-{id}, or when
  asked to "break down", "split", "decompose", or "chia nhỏ" a user story.
---

# /breakdown — Story Decomposition

**Input:** User Story ID — ví dụ `/breakdown US-004`
**Output:** nhiều file `.md` trong cùng sprint folder + bảng execution waves in ra chat.

---

## Process

### Step 1 — Đọc story gốc

Tìm file tại `po-requests/sprint-*/US-{id}-*.md`. Đọc kỹ:
- Tổng story points
- Tất cả Acceptance Criteria
- Technical Notes (layers nào cần thay đổi)

### Step 2 — Nhóm AC theo business domain (Round 1)

Nhóm các AC thành 2–4 cluster logic. Mỗi cluster phải:
- Có thể ship độc lập (vertical slice của 1 tính năng nhỏ)
- Không vượt quá 1 "concern" duy nhất
- Fit trong 1–3 story points sau khi split

**Ví dụ US-004 (8 SP):**
| Cluster | ACs | Concern |
|---|---|---|
| A | AC1–AC5 | Quản lý Steps |
| B | AC6–AC10 | Quản lý Fields |
| C | AC11–AC12 | Auto-save |

### Step 3 — Split theo layer (Round 2)

Với mỗi cluster, xác định layer cần thay đổi:

| Layer | Khi nào |
|---|---|
| `shared` | Cần sửa `packages/types` hoặc `packages/validators` |
| `api` | NestJS controller, service, repository, Prisma |
| `web` | Next.js component, hook, store, page |
| `embed` | Preact widget |

**Quy tắc:**
- Cluster chỉ ảnh hưởng 1 layer → 1 sub-story
- Cluster cần cả `api` lẫn `web` → tách thành 2 sub-story riêng
- Nhiều cluster dùng chung 1 API endpoint → **gộp thành 1 sub-story `api`** duy nhất (tránh duplicate)
- `shared` luôn được tách riêng vì cả `api` lẫn `web` phụ thuộc vào nó

### Step 4 — Đặt ID theo thứ tự dependency

Đặt letter `a`, `b`, `c`... theo thứ tự có thể bắt đầu, không phải theo cluster:
- `a`, `b`... = task không có dependency (ưu tiên đặt trước)
- Tiếp theo mới đến task phụ thuộc

**Ví dụ US-004:**
```
US-004a → api (không phụ thuộc gì)
US-004b → web steps (phụ thuộc US-004a)
US-004c → web fields (phụ thuộc US-004a, song song với US-004b)
US-004d → web auto-save (phụ thuộc US-004a, song song với US-004b và US-004c)
```

### Step 5 — Map dependencies

**Quy tắc cứng:**
- `api` không bao giờ depend vào `web`
- `web` phụ thuộc vào `api` của cùng feature
- `shared` không phụ thuộc vào ai
- `api` và `web` đều phụ thuộc vào `shared` nếu có
- Hai task cùng layer, khác cluster → độc lập (có thể parallel)

### Step 6 — Tạo file + in summary

Tạo từng file, sau đó in bảng execution waves ra chat.

---

## File format

```markdown
---
parent: US-004
layer: api
depends_on: []
story_points: 2
---

# US-004a: [Tên ngắn gọn mô tả sub-task]

## Mô tả
[1–2 câu: sub-story này implement gì, cho ai]

## Acceptance Criteria
- [ ] AC1: ...
- [ ] AC2: ...

## Technical Notes
[Endpoint, component, hook, schema cụ thể cần tạo/sửa]
```

**Đặt file tại:** `po-requests/sprint-{N}/US-{id}{letter}-{slug}.md`
- `{slug}` = mô tả ngắn của sub-task, kebab-case
- Ví dụ: `US-004a-api-form-schema.md`, `US-004b-web-step-management.md`

---

## Summary output (in ra chat sau khi tạo file)

```
## Breakdown: US-004 (8 SP → 4 sub-stories)

| ID | Layer | SP | Depends on | Parallel? |
|---|---|---|---|---|
| US-004a | api | 2 | — | ✅ bắt đầu ngay |
| US-004b | web | 3 | US-004a | ⏳ sau US-004a |
| US-004c | web | 2 | US-004a | ✅ song song với US-004b |
| US-004d | web | 1 | US-004a | ✅ song song với US-004b, US-004c |

### Execution waves
Wave 1: US-004a
Wave 2: US-004b · US-004c · US-004d

Tổng: 8 SP → 2 waves. Wave 2 có thể chạy 3 agent song song.

### Lệnh chạy tiếp theo

Wave 1 — chạy ngay:
`Implement US-004a`

Wave 2 — chạy sau khi Wave 1 xong (song song):
`Implement US-004b, US-004c, US-004d song song`
```

**Quy tắc gen lệnh:**
- Wave có 1 task → `Implement US-{id}{letter}` (không có "song song")
- Wave có 2+ task → `Implement US-{a}, US-{b}, US-{c} song song`
- Label: "chạy ngay" cho wave đầu, "chạy sau khi Wave N xong" cho các wave sau

---

## Ví dụ đầy đủ — US-004 (8 SP)

Story gốc có 3 clusters × 2 layers = 4 sub-stories (API được gộp chung):

| File | ID | Layer | SP | depends_on |
|---|---|---|---|---|
| `US-004a-api-form-schema.md` | US-004a | api | 2 | `[]` |
| `US-004b-web-step-management.md` | US-004b | web | 3 | `[US-004a]` |
| `US-004c-web-field-management.md` | US-004c | web | 2 | `[US-004a]` |
| `US-004d-web-autosave.md` | US-004d | web | 1 | `[US-004a]` |

Wave 2 (US-004b, US-004c, US-004d) có thể dùng 3 agent song song sau khi US-004a xong.
