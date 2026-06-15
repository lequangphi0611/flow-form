# US-002: Đăng nhập tài khoản

## User Story

As a **form owner đã có tài khoản**,  
I want **đăng nhập bằng email và mật khẩu**,  
So that **tôi có thể truy cập lại dashboard và quản lý form của mình**.

---

## Acceptance Criteria

- [ ] AC1: Trang đăng nhập có 2 trường: Email và Mật khẩu, cùng nút "Đăng nhập"
- [ ] AC2: Nếu email không tồn tại hoặc mật khẩu sai, hiển thị thông báo lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ field nào sai vì lý do bảo mật)
- [ ] AC3: Đăng nhập thành công → điều hướng về trang Dashboard (danh sách form)
- [ ] AC4: Nếu người dùng đã đăng nhập rồi mà cố vào trang `/login`, tự động redirect về Dashboard
- [ ] AC5: Nếu người dùng chưa đăng nhập mà cố vào trang Dashboard hoặc Builder, tự động redirect về `/login`
- [ ] AC6: Có link "Chưa có tài khoản? Đăng ký" điều hướng sang trang đăng ký
- [ ] AC7: Trong khi đang xử lý đăng nhập, nút "Đăng nhập" bị disable và hiển thị trạng thái loading
- [ ] AC8: Người dùng có thể đăng xuất từ bất kỳ trang nào trong dashboard — session bị hủy và redirect về `/login`

---

## Priority

Must Have

---

## Story Points

2

---

## Technical Notes

- **API layer**: Better Auth xử lý endpoint đăng nhập (`/api/auth/sign-in`). Không cần tạo controller riêng
- **Web layer**: Trang `/login` — dùng better-auth/react client (`signIn.email()`). Route protection bằng Next.js middleware kiểm tra session
- Session được lưu trong database (không cần Redis) — cần đảm bảo AuthGuard đọc session từ DB

---

## Notes

Session không có thời gian hết hạn ngắn trong MVP — người dùng sẽ ở đăng nhập cho đến khi họ chủ động đăng xuất. Điều này đơn giản hóa UX và phù hợp với Better Auth database session.
