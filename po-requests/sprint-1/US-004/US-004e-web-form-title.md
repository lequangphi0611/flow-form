---
parent: US-004
layer: web
depends_on: [US-004a]
story_points: 1
---

# US-004e: Form title inline edit trong Builder header

## Mô tả

Owner có thể đổi tên form trực tiếp trong header của Builder bằng cách click vào tiêu đề — chuyển sang input inline, không mở modal. Thay đổi được auto-save theo cùng cơ chế AC11.

## Acceptance Criteria

- [ ] AC13: Owner có thể đổi tên form bằng cách nhấn vào tiêu đề form ở header của Builder — tiêu đề chuyển sang chế độ chỉnh sửa inline (input field) ngay tại chỗ, không mở modal hay chuyển trang
- [ ] AC14: Khi đang chỉnh sửa tiêu đề form, nhấn Enter hoặc click ra ngoài thì xác nhận thay đổi; nhấn Escape thì hủy và giữ nguyên tiêu đề cũ
- [ ] AC15: Tiêu đề form không được để trống — nếu owner xóa hết nội dung rồi xác nhận, hiển thị thông báo lỗi inline và khôi phục lại tiêu đề trước đó
- [ ] AC16: Thay đổi tiêu đề form được auto-save theo cùng cơ chế AC11 (hiển thị trạng thái "Đang lưu..." và "Đã lưu")

## Technical Notes

**Files tạo mới:**
- `apps/web/src/components/builder/FormTitleInput.tsx` — component tự đọc store, quản lý inline edit state

**Files sửa:**
- `apps/web/src/store/builder.store.ts` — thêm action `updateTitle(title: string)`
- `apps/web/src/components/builder/BuilderLayout.tsx` — thay `<span>{formTitle}</span>` bằng `<FormTitleInput />`, bỏ prop `formTitle`
- `apps/web/src/components/builder/containers/BuilderContainer.tsx` — bỏ đọc `formTitle` từ store và bỏ truyền prop xuống `BuilderLayout`

**Store action:**
```ts
updateTitle: (title) =>
  set((s) => {
    if (!s.form) return
    s.form.title = title
  }),
```
`form.title` đã được `useAutoSave` watch — không cần wiring thêm.

**`FormTitleInput` — đọc store trực tiếp (Builder component pattern, rule 07 §4):**
```tsx
// Không nhận props — tự đọc store và gọi action
// Local state: isEditing (boolean), draftValue (string)
// Click span → isEditing = true, draftValue = current title
// onKeyDown: Enter → confirm; Escape → cancel
// onBlur → confirm
// confirm: trimmed empty → revert + không gọi updateTitle; else updateTitle(trimmed)
```

**UX:**
- Khi `isEditing = false`: render `<span>` có cursor `cursor-pointer` + hover underline dashed để gợi ý có thể edit
- Khi `isEditing = true`: render `<input>` auto-focused, `text-lg font-semibold`, `max-w-xs`, border-bottom style (không dùng full Input shadcn — cần inline seamless)
- Lỗi tiêu đề trống: `<p className="text-xs text-red-500">` xuất hiện bên dưới input, tự biến mất sau 2 giây hoặc khi bắt đầu gõ lại

Đọc rules: `rules/frontend/03-state.md`, `rules/frontend/07-builder.md`
