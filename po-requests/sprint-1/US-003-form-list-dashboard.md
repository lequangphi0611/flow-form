# US-003: Dashboard danh sách form

## User Story

As a **form owner đã đăng nhập**,  
I want **xem tất cả form tôi đã tạo trong một trang tổng quan**,  
So that **tôi có thể quản lý, chỉnh sửa, và theo dõi trạng thái từng form**.

---

## Acceptance Criteria

- [ ] AC1: Trang Dashboard hiển thị danh sách tất cả form của người dùng đang đăng nhập (không hiển thị form của người khác)
- [ ] AC2: Mỗi form hiển thị: tên form, trạng thái (Draft / Published / Closed), ngày tạo, và số lượng responses đã nhận
- [ ] AC3: Khi chưa có form nào, hiển thị màn hình trống với nút "Tạo form đầu tiên" thay vì danh sách rỗng
- [ ] AC4: Có nút "Tạo form mới" ở vị trí nổi bật — nhấn vào tạo form mới và điều hướng vào Builder
- [ ] AC5: Nhấn vào tên form hoặc nút "Chỉnh sửa" → điều hướng vào Builder của form đó
- [ ] AC6: Mỗi form có menu hành động (ba chấm hoặc tương tự) với các tùy chọn: Chỉnh sửa, Xem responses, Xóa
- [ ] AC7: Khi nhấn "Xóa", hiển thị hộp thoại xác nhận trước khi xóa thật sự. Xóa form sẽ xóa toàn bộ responses liên quan
- [ ] AC8: Danh sách form được sắp xếp theo thứ tự mới nhất lên đầu

---

## Priority

Must Have

---

## Story Points

3

---

## Technical Notes

- **API layer**: `GET /api/forms` — chỉ trả về form của user đang đăng nhập (AuthGuard + filter by ownerId). `DELETE /api/forms/:id` — chỉ owner được xóa (FormOwnerGuard)
- **Web layer**: Route `(dashboard)/forms/page.tsx` — Server Component fetch danh sách, hiển thị dạng card grid hoặc table. "Tạo form mới" gọi `POST /api/forms` với tên mặc định rồi redirect vào Builder
- Số responses (`responseCount`) có thể là field counter hoặc subquery — dev tự quyết định implementation

---

## Notes

Trong Sprint 1, dashboard chỉ cần hiển thị danh sách đơn giản. Các tính năng nâng cao như search, filter theo trạng thái, sắp xếp tùy chỉnh — dời sang sprint sau khi có đủ dữ liệu thực để xác nhận nhu cầu.

Giới hạn Free tier (tối đa 3 forms) chưa cần enforce trong Sprint 1 — sẽ làm cùng lúc với Pricing sprint.
