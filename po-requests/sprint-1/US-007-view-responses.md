# US-007: Xem danh sách responses

## User Story

As a **form owner**,  
I want **xem tất cả phản hồi đã được nộp cho form của mình**,  
So that **tôi có thể đọc thông tin khách hàng gửi lên và xử lý theo quy trình của mình**.

---

## Acceptance Criteria

- [ ] AC1: Từ Dashboard hoặc từ Builder, owner có thể điều hướng vào trang "Responses" của từng form
- [ ] AC2: Trang Responses chỉ hiển thị các response có trạng thái "Submitted" (đã nộp hoàn chỉnh). Các draft chưa submit không hiển thị ở đây
- [ ] AC3: Danh sách responses được sắp xếp theo thứ tự mới nhất lên đầu. Mỗi dòng hiển thị: thời gian nộp, và preview ngắn của một vài trường đầu tiên (ví dụ: tên, email nếu có)
- [ ] AC4: Nhấn vào một response → mở xem chi tiết toàn bộ câu trả lời của response đó, trình bày theo từng bước (step) như cấu trúc form
- [ ] AC5: Khi form chưa có response nào, hiển thị màn hình trống với thông báo gợi ý chia sẻ link form
- [ ] AC6: Chỉ owner của form mới xem được responses — truy cập trái phép trả về lỗi "Không có quyền truy cập"
- [ ] AC7: Trang Responses hiển thị tổng số response đã nhận (ví dụ: "12 phản hồi")

---

## Priority

Must Have

---

## Story Points

5

---

## Technical Notes

- **API layer**: `GET /api/forms/:id/responses` — trả về danh sách responses đã submitted, chỉ cho phép owner (FormOwnerGuard + AuthGuard). Response data nằm trong JSONB field — trả về nguyên để frontend render
- **Web layer**: Route có thể nằm trong `(dashboard)/forms/[id]/responses/page.tsx`. Server Component fetch danh sách, click vào dùng modal hoặc trang detail riêng (dev tự quyết)
- Response detail: render dữ liệu theo cấu trúc step của form schema — cần fetch cả form schema và response data

---

## Notes

Trong Sprint 1, trang Responses chỉ cần read-only — xem và đọc. Các tính năng nâng cao dời về sau:
- **Lọc / tìm kiếm** response — Sprint 5
- **Export CSV** — Sprint 5  
- **Đánh dấu đã xử lý / archive** response — Sprint 5
- **Xóa response riêng lẻ** — Should Have, dev xem xét nếu có thời gian

Preview trường đầu tiên: nên ưu tiên hiển thị field có `type = "email"` hoặc `type = "text"` đầu tiên như "identifier" cho dễ nhận diện — nhưng đây là gợi ý UX, dev có thể quyết định cách render phù hợp.
