# US-006: Điền và nộp form (Engine Wizard)

## User Story

As a **người dùng cuối (respondent)**,  
I want **điền form theo từng bước và nộp khi hoàn thành**,  
So that **tôi có thể gửi thông tin của mình đến form owner một cách rõ ràng và không bị overwhelm bởi quá nhiều câu hỏi cùng lúc**.

---

## Acceptance Criteria

### Điều hướng từng bước
- [ ] AC1: Form hiển thị từng step một, không hiện tất cả fields cùng lúc. Có thanh tiến trình (progress bar hoặc "Bước X / Y") để người dùng biết mình đang ở đâu
- [ ] AC2: Nút "Tiếp theo" (Next) chuyển sang step tiếp theo. Nút "Quay lại" (Back) quay về step trước — dữ liệu đã nhập ở step trước không bị mất
- [ ] AC3: Ở bước cuối cùng, nút "Tiếp theo" được thay bằng nút "Gửi" (Submit)

### Validation
- [ ] AC4: Khi nhấn "Tiếp theo", các fields bắt buộc (required) trong step hiện tại phải được điền. Nếu thiếu, hiển thị thông báo lỗi rõ ràng ngay dưới từng field bị thiếu — không cho chuyển bước
- [ ] AC5: Field Email phải đúng định dạng email trước khi cho chuyển bước
- [ ] AC6: Field Number chỉ chấp nhận giá trị số
- [ ] AC7: Field Rating cho phép chọn từ 1 đến 5 — bắt buộc phải chọn nếu là required field
- [ ] AC8: Field Yes/No bắt buộc phải chọn một trong hai nếu là required field

### Auto-save nháp
- [ ] AC9: Khi người dùng đang điền và thoát (đóng tab, tắt browser), dữ liệu đã điền được tự động lưu dưới dạng nháp (draft). Lần sau mở lại link form, hệ thống hỏi "Bạn có muốn tiếp tục từ lần trước không?" — nếu đồng ý thì khôi phục dữ liệu và bước đang dở
- [ ] AC10: Auto-save xảy ra trong im lặng (không hiển thị thông báo nổi bật) — chỉ cần lưu đủ để khôi phục sau

### Submit
- [ ] AC11: Sau khi nhấn "Gửi" thành công, hiển thị trang xác nhận với thông báo cảm ơn. Trang xác nhận không cho phép submit lại
- [ ] AC12: Nếu gửi thất bại (lỗi mạng, server lỗi), hiển thị thông báo lỗi và nút "Thử lại" — dữ liệu đã nhập không bị mất

---

## Priority

Must Have

---

## Story Points

8

---

## Technical Notes

- **Web layer**: Trang public `f/[formId]/page.tsx` — SSR fetch form schema, render Engine Wizard là Client Component. React Hook Form quản lý state wizard, Zod schema được xây động từ field definitions. Step navigation thuần client-side
- **API layer**: `POST /api/forms/:id/responses` — lưu response cuối (submitted). `POST /api/forms/:id/responses/draft` — lưu nháp (upsert theo sessionId hoặc localStorage key). Cả 2 endpoints không yêu cầu auth (public form)
- Auto-save: debounced call (khoảng 1–2 giây sau khi người dùng ngừng gõ). Session identifier dùng localStorage (anonymous respondent chưa có tài khoản)
- Draft khôi phục: khi load trang, kiểm tra localStorage có draft key cho formId này không, nếu có thì fetch draft từ API và hỏi người dùng

---

## Notes

**Xử lý draft identifier**: Respondent trong Sprint 1 là anonymous (không cần đăng nhập). Draft được liên kết với một ID ngẫu nhiên lưu trong localStorage của browser. Nếu người dùng dùng browser khác hoặc xóa localStorage thì mất draft — đây là trade-off chấp nhận được cho MVP.

**Draft timeout**: Draft không bị xóa tự động trong Sprint 1. Chính sách "draft hết hạn sau 30 ngày" sẽ được implement sau với pg-boss job.

**Respondent có tài khoản**: Ngoài scope của Sprint 1. Hiện tại respondent luôn là anonymous.
