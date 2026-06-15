# US-005: Xuất bản form và lấy link chia sẻ

## User Story

As a **form owner**,  
I want **xuất bản form và nhận được link công khai để chia sẻ**,  
So that **người dùng cuối có thể truy cập và điền form của tôi**.

---

## Acceptance Criteria

- [ ] AC1: Trong Builder, có nút "Xuất bản" (Publish) ở vị trí nổi bật (ví dụ: góc trên bên phải)
- [ ] AC2: Trước khi publish, hệ thống kiểm tra form có tối thiểu 1 step và mỗi step có tối thiểu 1 field. Nếu không đạt, hiển thị thông báo lý do và không cho publish
- [ ] AC3: Sau khi nhấn "Xuất bản" thành công, trạng thái form chuyển từ "Draft" sang "Published"
- [ ] AC4: Sau khi publish, hiển thị link công khai của form (dạng `https://flowform.app/f/[formId]` hoặc tương tự). Owner có thể copy link bằng nút "Sao chép link"
- [ ] AC5: Người dùng chưa đăng nhập có thể truy cập link công khai và điền form — không yêu cầu đăng nhập
- [ ] AC6: Form đang ở trạng thái "Draft" khi được truy cập qua link công khai thì hiển thị trang thông báo "Form này chưa được xuất bản"
- [ ] AC7: Owner có thể "Đóng form" (Close) — chuyển trạng thái sang "Closed". Form đang closed khi được truy cập qua link công khai thì hiển thị trang thông báo "Form này đã đóng, không còn nhận thêm phản hồi"
- [ ] AC8: Owner có thể "Hủy xuất bản" (Unpublish) để đưa form về Draft và chỉnh sửa tiếp — chỉ khi form đang ở trạng thái Published

---

## Priority

Must Have

---

## Story Points

3

---

## Technical Notes

- **API layer**: `PATCH /api/forms/:id/publish` — đổi status sang `published`. Cần kiểm tra business rule (tối thiểu 1 step, 1 field) trong Service layer trước khi lưu. Endpoint `GET /api/forms/:id` là public (không cần auth) — trả về form schema cho Engine render
- **Web layer**: Nút Publish trong Builder gọi mutation. Sau khi thành công, hiển thị modal hoặc panel với link. Trang public `f/[formId]` — SSR với Next.js, kiểm tra `status` của form để quyết định render gì
- Trạng thái form: `draft` | `published` | `closed` — lưu trong bảng Form

---

## Notes

Link công khai dùng `formId` (UUID hoặc slug ngắn). Trong Sprint 1 dùng ID gốc cho đơn giản — custom slug (vanity URL) là tính năng nâng cao sẽ xem xét sau.

"Unpublish" và "Close" là 2 hành động khác nhau về mặt nghiệp vụ: Unpublish đưa form về Draft để sửa tiếp; Close là đóng form nhưng vẫn giữ nguyên responses và không thể điền thêm. Cần phân biệt rõ trong UI.
