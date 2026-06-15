# US-001: Đăng ký tài khoản

## User Story

As a **form owner mới**,  
I want **tạo tài khoản FlowForm bằng email và mật khẩu**,  
So that **tôi có thể bắt đầu tạo và quản lý form của mình**.

---

## Acceptance Criteria

- [ ] AC1: Trang đăng ký có các trường: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu
- [ ] AC2: Email phải đúng định dạng (có @ và domain). Nếu sai, hiển thị lỗi inline bên dưới field ngay khi người dùng rời khỏi field đó
- [ ] AC3: Mật khẩu phải tối thiểu 8 ký tự. Nếu không đủ, hiển thị thông báo lỗi rõ ràng
- [ ] AC4: Nếu "Xác nhận mật khẩu" không khớp với "Mật khẩu", hiển thị lỗi trước khi submit
- [ ] AC5: Nếu email đã tồn tại trong hệ thống, sau khi submit hiển thị thông báo "Email này đã được sử dụng"
- [ ] AC6: Đăng ký thành công → tự động đăng nhập → điều hướng về trang Dashboard (danh sách form)
- [ ] AC7: Trong khi đang xử lý đăng ký, nút "Đăng ký" bị disable và hiển thị trạng thái loading để tránh submit nhiều lần
- [ ] AC8: Có link "Đã có tài khoản? Đăng nhập" điều hướng sang trang đăng nhập

---

## Priority

Must Have

---

## Story Points

3

---

## Technical Notes

- **API layer**: Better Auth xử lý endpoint đăng ký (`/api/auth/sign-up`). Không cần tạo controller riêng
- **Web layer**: Trang `/register` — dùng better-auth/react client (`signUp.email()`). Form validation chạy phía client trước khi gọi API
- Sau đăng ký thành công, session được tạo tự động — không cần bước login riêng

---

## Notes

Giai đoạn MVP chỉ hỗ trợ đăng ký bằng email/mật khẩu. OAuth (Google, GitHub) sẽ xem xét sau khi có phản hồi từ người dùng thực.

Họ tên (display name) được lưu để hiển thị trong dashboard và góc phải màn hình — không dùng cho auth logic.
