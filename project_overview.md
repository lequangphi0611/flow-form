# FlowForm

> **Dynamic Form Builder SaaS** — Tài liệu tổng quan nghiệp vụ  
> Phiên bản 1.0 · Tháng 6 năm 2026

---

## 1. Tầm nhìn sản phẩm

FlowForm là nền tảng SaaS giúp các doanh nghiệp tự tạo form thu thập thông tin theo nhiều bước (multi-step wizard) mà không cần lập trình. Người dùng có thể thiết kế form trực quan, đặt điều kiện hiển thị thông minh, và theo dõi kết quả qua dashboard phân tích được tích hợp sẵn.

**Mục tiêu cốt lõi:** giúp form owner hiểu rõ người dùng đang "gãy" ở đâu trong hành trình điền form — để tối ưu liên tục và tăng tỷ lệ hoàn thành.

---

## 2. Đối tượng khách hàng mục tiêu

### Khách hàng chính

- Doanh nghiệp vừa và nhỏ (SME) cần thu thập đơn đăng ký, khảo sát, đơn đặt hàng, yêu cầu hỗ trợ
- Các agency và freelancer thiết kế quy trình onboarding khách hàng
- Startup SaaS cần form nội bộ: phê duyệt dự án, đánh giá hiệu suất, khảo sát nội bộ
- Trường học, tổ chức phi lợi nhuận cần thu thập thông tin đăng ký, đơn từ, phản hồi

### Vấn đề họ đang gặp

- **Google Forms** quá đơn giản: không có logic điều kiện, không có multi-step, giao diện khuôn mẫu
- **Typeform** đắt tiền và giới hạn response ở gói miễn phí
- Không biết form có hiệu quả không vì không có analytics
- Người dùng cuối bỏ giữa chừng nhưng form owner không biết ở bước nào

---

## 3. Tính năng cốt lõi

### Builder — Tạo form

| Tính năng | Mô tả |
|---|---|
| Step editor | Kéo thả để tạo và sắp xếp các bước wizard. Mỗi bước có tiêu đề riêng, có thể ẩn/hiện theo điều kiện |
| Field library | Hỗ trợ nhiều loại trường: văn bản, số, lựa chọn, đính kèm file, ngày tháng, đánh giá sao, chữ ký |
| Logic builder | Thiết lập quy tắc "nếu — thì" bằng giao diện trực quan: nếu [câu hỏi A] = [giá trị X] thì hiển thị [trường B] hoặc chuyển sang [bước Y] |
| Theme editor | Tùy chỉnh logo, bảng màu, font chữ để form mang thương hiệu của doanh nghiệp |

### Engine — Trải nghiệm người dùng cuối

| Tính năng | Mô tả |
|---|---|
| Wizard renderer | Form hiển thị từng bước rõ ràng, có thanh tiến trình, nút Trước/Tiếp theo, và validate từng bước trước khi cho phép tiến |
| Lưu tạm & tiếp tục | Người dùng có thể dừng giữa chừng và quay lại tiếp tục sau. Dữ liệu được lưu tự động |
| Nhúng vào website | Tích hợp form vào bất kỳ trang web nào qua đoạn mã nhỏ. Hỗ trợ hiển thị dạng popup hoặc nằm trong trang |

### Analytics — Phân tích kết quả

| Tính năng | Mô tả |
|---|---|
| Funnel view | Biểu đồ phễu thể hiện tỷ lệ người dùng hoàn thành từng bước. Nhìn rõ người dùng bỏ ở đâu |
| Bảng phản hồi | Xem toàn bộ response, tìm kiếm, lọc theo điều kiện, xuất file Excel/CSV |
| Field insights | Thống kê thời gian trung bình điền mỗi trường, tỷ lệ bỏ qua, phân phối câu trả lời |

---

## 4. Hành trình người dùng

### Form owner (người tạo form)

```
Đăng ký tài khoản  →  Tạo form mới  →  Thêm bước & trường  →  Cài logic điều kiện  →  Xuất bản / chia sẻ link  →  Theo dõi analytics
```

### Người điền form (end user)

```
Mở link / popup  →  Điền từng bước  →  (Tùy chọn) Lưu tạm  →  Xem lại & gửi  →  Trang xác nhận
```

---

## 5. Gói dịch vụ dự kiến

| | Free | Starter | Pro | Business |
|---|---|---|---|---|
| Số form | 3 | 10 | Không giới hạn | Không giới hạn |
| Response/tháng | 100 | 1.000 | 10.000 | Custom |
| Analytics | Không | Cơ bản | Đầy đủ | Đầy đủ |
| Logic điều kiện | Không | Không | Có | Có |
| Hỗ trợ | Cộng đồng | Email | Ưu tiên | SLA + Onboarding 1-1 |

---

## 6. Điểm khác biệt cạnh tranh

- **Logic điều kiện trực quan** — không cần hiểu kỹ thuật, dùng giao diện "nếu — thì" dạng kéo thả
- **Drop-off analytics theo từng bước** — form owner biết chính xác người dùng bỏ ở đâu để tối ưu
- **Lưu tạm & tiếp tục** — giảm tỷ lệ bỏ giữa chừng với form nhiều bước
- **Nhúng vào website bằng đoạn mã nhỏ** — không yêu cầu cài đặt hay developer
- **Giao diện tiếng Việt** — ưu tiên thị trường Việt Nam và Đông Nam Á

---

## 7. Lộ trình phát triển

### Giai đoạn 1 — MVP (tháng 1–3)

- Builder cơ bản: thêm bước, thêm field, xuất bản form
- Engine wizard với validation và lưu tạm
- Bảng response đơn giản
- Gói Free & Starter

### Giai đoạn 2 — Cơ bản đầy đủ (tháng 4–6)

- Logic điều kiện trực quan
- Funnel analytics và field insights
- Theme editor & tùy chỉnh thương hiệu
- Nhúng form qua iframe / JS snippet

### Giai đoạn 3 — Tăng trưởng (tháng 7–12)

- Gói Pro và Business
- Tích hợp webhook để kết nối với các công cụ khác
- AI gợi ý cấu trúc form từ mô tả nghiệp vụ
- Thư viện template theo ngành nghề

---

*FlowForm · Tài liệu nội bộ — Phiên bản 1.0 — Tháng 6 năm 2026*