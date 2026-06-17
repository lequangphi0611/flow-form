---
name: git-workflow
description: >
  FlowForm git workflow — sprint branching, story branching, and commit conventions.
  Auto-load when: starting a sprint, creating a branch, starting a new story or task,
  writing or reviewing a commit message, or asked about branch/commit format.
---

# Git Workflow — FlowForm

Branch hierarchy và commit convention cho monorepo này. Đọc trước khi bắt
đầu sprint mới, tạo branch, hoặc commit.

---

## Branch hierarchy

```
main
└── sprint/sprint-{N}          ← tạo khi bắt đầu sprint
    ├── feature/US-{id}-{slug} ← tạo khi bắt đầu 1 US
    ├── fix/US-{id}-{slug}
    └── chore/US-{id}-{slug}
```

Feature branch **luôn base từ sprint branch**, không phải `main`.

---

## Bắt đầu sprint mới

```bash
# Tạo sprint branch từ main
git checkout main
git pull origin main
git checkout -b sprint/sprint-{N}
git push -u origin sprint/sprint-{N}
```

Ví dụ: `sprint/sprint-1`, `sprint/sprint-2`

---

## Bắt đầu User Story

```bash
# Base từ sprint branch hiện tại, KHÔNG phải main
git checkout sprint/sprint-{N}
git pull origin sprint/sprint-{N}
git checkout -b feature/US-{id}-{slug}
```

Pattern tên branch: `{type}/US-{id}-{slug}`

| Type | Khi nào |
|---|---|
| `feature/` | Story mới, tính năng mới |
| `fix/` | Bug fix |
| `chore/` | Refactor, config, migration, tooling |

```bash
# ✅ Đúng — base từ sprint branch
git checkout -b feature/US-003-api-forms-crud   # khi đang ở sprint/sprint-1

# ❌ Sai
git checkout -b feature/US-003-api-forms-crud main  # base từ main, bỏ qua sprint
feat/forms-api                                       # thiếu US-{id}
feature/forms                                        # thiếu id và slug
```

---

## Commit format

Pattern: `type(scope): description`

### Types

| Type | Khi nào |
|---|---|
| `feat` | Thêm tính năng mới |
| `fix` | Bug fix (code hoặc logic) |
| `refactor` | Tái cấu trúc, không đổi behavior |
| `docs` | Chỉ sửa docs, CLAUDE.md, project_overview |
| `chore` | Config, tooling, migration, package update |
| `test` | Thêm / sửa test |

### Scope theo thư mục (bắt buộc)

| Thư mục chính bị thay đổi | Scope |
|---|---|
| `apps/api/src/` | `api` |
| `apps/api/prisma/` | `prisma` |
| `apps/web/src/` | `web` hoặc `fe` |
| `apps/embed/src/` | `embed` |
| `packages/validators/` | `validators` |
| `packages/types/` | `types` |
| `.claude/skills/` | `skills` |
| `rules/` | `rules` |
| Thay đổi cross-cutting (nhiều app + rules) | tên của vấn đề: `clean-code`, `auth`, `analytics` |

### Subject line rules

- **Lowercase** — không viết hoa chữ đầu
- **Imperative** — "add", "fix", "remove" — không phải "added", "fixed"
- **≤ 72 ký tự**
- **Không dấu chấm** ở cuối

### Ví dụ từ repo này

```
feat(api): implement forms CRUD with auth and ownership guards
fix(analytics): remove any casts, add auth guards
refactor(fe): enforce custom hook for useQuery, not just useMutation
docs(rules): add shared clean code rule covering 4 areas
chore(prisma): add FormStatus enum migration
feat(skills): update grill-me to ask one question at a time
fix(clean-code): apply FE clean code fixes from review
```

---

## Checklist trước khi tạo branch

- [ ] Sprint branch đã tồn tại (`sprint/sprint-{N}`)
- [ ] Branch name đúng `type/US-{id}-{slug}`
- [ ] `type` prefix là `feature`, `fix`, hoặc `chore` — không phải `feat`
- [ ] Branch được tạo từ sprint branch, không phải `main`

## Checklist trước khi commit

- [ ] `type` phản ánh đúng bản chất: `feat` nếu thêm mới, `fix` nếu sửa bug, `refactor` nếu không đổi behavior
- [ ] `scope` tương ứng thư mục chính bị thay đổi
- [ ] Subject ≤ 72 ký tự, lowercase, imperative, không dấu chấm
- [ ] Không commit file `.env` hay credentials
