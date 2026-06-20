# US-004: Tạo và chỉnh sửa form trong Builder

## User Story

As a **form owner**,  
I want **tạo form với nhiều bước (steps) và thêm fields vào từng bước**,  
So that **tôi có thể thiết kế quy trình thu thập thông tin nhiều bước phù hợp với nhu cầu của mình**.

---

## Acceptance Criteria

### Form Title
- [ ] AC13: Owner có thể đổi tên form bằng cách nhấn vào tiêu đề form ở header của Builder — tiêu đề chuyển sang chế độ chỉnh sửa inline (input field) ngay tại chỗ, không mở modal hay chuyển trang
- [ ] AC14: Khi đang chỉnh sửa tiêu đề form, nhấn Enter hoặc click ra ngoài thì xác nhận thay đổi; nhấn Escape thì hủy và giữ nguyên tiêu đề cũ
- [ ] AC15: Tiêu đề form không được để trống — nếu owner xóa hết nội dung rồi xác nhận, hiển thị thông báo lỗi inline và khôi phục lại tiêu đề trước đó
- [ ] AC16: Thay đổi tiêu đề form được auto-save theo cùng cơ chế AC11 (hiển thị trạng thái "Đang lưu..." và "Đã lưu")

### Quản lý Steps
- [ ] AC1: Builder mặc định có sẵn 1 step khi form mới được tạo
- [ ] AC2: Owner có thể thêm step mới — step mới xuất hiện ở cuối danh sách, có tiêu đề mặc định là "Bước [số thứ tự]"
- [ ] AC3: Owner có thể đổi tên step bằng cách nhấn vào tiêu đề và chỉnh sửa inline
- [ ] AC4: Owner có thể xóa step (không thể xóa nếu chỉ còn 1 step duy nhất — hiển thị thông báo lý do)
- [ ] AC5: Owner có thể kéo thả để sắp xếp lại thứ tự các steps

### Quản lý Fields
- [ ] AC6: Mỗi step có thể chứa nhiều fields. Owner chọn loại field từ danh sách: Text, Email, Number, Date, Textarea, Dropdown (select), Multi-select, Rating (1–5 sao), Yes/No
- [ ] AC7: Mỗi field có thể đặt nhãn (label) và đánh dấu là bắt buộc (required) hoặc không
- [ ] AC8: Field Dropdown và Multi-select cho phép owner nhập danh sách các lựa chọn (tối thiểu 1 lựa chọn)
- [ ] AC9: Owner có thể xóa field khỏi step
- [ ] AC10: Owner có thể kéo thả để sắp xếp lại thứ tự fields trong cùng một step

### Auto-save
- [ ] AC11: Mọi thay đổi trong Builder được tự động lưu sau một khoảng ngắn khi người dùng ngừng thao tác. Hiển thị trạng thái "Đang lưu..." và "Đã lưu" để người dùng yên tâm
- [ ] AC12: Khi owner thoát Builder rồi quay lại, toàn bộ cấu trúc form (steps, fields) được khôi phục đúng như lúc rời đi

---

## Priority

Must Have

---

## Story Points

8

---

## Technical Notes

- **Web layer (Builder)**: Route `(builder)/forms/[id]/builder/page.tsx` — layout full-screen. State toàn bộ nằm trong Zustand store (`builder.store.ts`). Drag & drop dùng dnd-kit. Auto-save là debounced mutation gọi `PATCH /api/forms/:id`
- **API layer**: `PATCH /api/forms/:id` nhận form schema (steps + fields) dưới dạng JSONB. Chỉ owner được sửa (FormOwnerGuard). Validate schema bằng Zod trước khi lưu
- **packages/types**: `FormSchema`, `Step`, `Field`, `FieldType` phải là shared types vì cả Builder (web) và Engine (web) đều dùng
- **packages/validators**: Zod schema cho FormSchema dùng chung API validation và Builder state typing

---

## Notes

**Field types nào trong Sprint 1**: Text, Email, Number, Date, Textarea, Dropdown, Multi-select, Rating, Yes/No. File Upload bị loại khỏi Sprint 1 vì cần R2 presigned URL flow — sẽ làm riêng sau.

**Placeholder text và help text cho field**: Là tính năng "Should Have" — nếu dev có thời gian thì làm, nếu không thì dời sang sprint sau. Focus vào label + required trước.

Kéo thả giữa các steps khác nhau (cross-step drag) là tính năng nâng cao — Sprint 1 chỉ cần kéo thả trong cùng step và sắp xếp steps là đủ.
