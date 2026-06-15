# Sprint 1 — Foundation MVP

## Sprint Goal

Xây dựng nền tảng end-to-end tối thiểu để một form owner có thể **đăng ký tài khoản → tạo form đơn giản → publish → chia sẻ link** và một người dùng cuối có thể **điền form → submit**. Owner sau đó vào dashboard xem được danh sách responses.

Kết thúc sprint này, toàn bộ "happy path" cơ bản phải chạy được dù chưa có tính năng nâng cao (logic điều kiện, analytics, embed widget).

---

## Sprint Timeline

| | |
|---|---|
| Bắt đầu | Tháng 6 năm 2026 |
| Kết thúc dự kiến | 2 tuần |
| Trạng thái | In Progress |

---

## Danh sách Stories

| Story | Tên | Priority | Points | Layer |
|---|---|---|---|---|
| [US-001](./US-001-user-registration.md) | Đăng ký tài khoản | Must Have | 3 | API + Web |
| [US-002](./US-002-user-login.md) | Đăng nhập tài khoản | Must Have | 2 | API + Web |
| [US-003](./US-003-form-list-dashboard.md) | Dashboard danh sách form | Must Have | 3 | API + Web |
| [US-004](./US-004-create-edit-form-builder.md) | Tạo và chỉnh sửa form trong Builder | Must Have | 8 | API + Web |
| [US-005](./US-005-publish-form.md) | Xuất bản form và lấy link chia sẻ | Must Have | 3 | API + Web |
| [US-006](./US-006-fill-submit-form.md) | Điền và nộp form (Engine Wizard) | Must Have | 8 | API + Web |
| [US-007](./US-007-view-responses.md) | Xem danh sách responses | Must Have | 5 | API + Web |

**Tổng Story Points: 32**

---

## Definition of Done cho Sprint 1

- [ ] Happy path hoàn chỉnh: đăng ký → tạo form → publish → điền form → submit → xem response
- [ ] Không có lỗi nghiêm trọng (crash, mất dữ liệu) trên happy path
- [ ] API được bảo vệ đúng (chỉ owner xem được response của form mình)
- [ ] Form validation hoạt động (required fields không thể bỏ qua)

---

## Out of Scope (Sprint này KHÔNG làm)

- Logic điều kiện (if/then skip logic) — dời sang Sprint 3
- Analytics và funnel chart — dời sang Sprint 5
- Embed widget — dời sang Sprint 4
- Custom branding/theme — dời sang Sprint 6
- File upload field — dời sang sau khi R2 integration ổn định
- Export CSV — dời sang Sprint 5
- Gói pricing/gating — dời sang Sprint 6
