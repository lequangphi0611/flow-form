---
name: sprint1-business-decisions
description: Các quyết định nghiệp vụ chốt trong Sprint 1 — field types, draft behavior, respondent identity, form status
metadata:
  type: project
---

Sprint 1 đã chốt các quyết định nghiệp vụ sau (tháng 6 năm 2026):

**Field types trong Sprint 1**: Text, Email, Number, Date, Textarea, Dropdown, Multi-select, Rating (1–5), Yes/No. File Upload bị loại khỏi Sprint 1 — cần R2 presigned URL flow riêng.

**Why:** File upload phức tạp hơn các field type còn lại, cần flow 3 bước với Cloudflare R2. Ưu tiên core flow trước.

**How to apply:** Khi dev hỏi về file upload field — xác nhận đây là out-of-scope Sprint 1, sẽ làm sau khi R2 integration ổn định.

---

**Draft respondent identifier**: Anonymous respondent dùng UUID lưu trong localStorage. Mất draft nếu đổi browser hoặc xóa localStorage — chấp nhận trong MVP.

**Why:** Respondent không cần tài khoản để điền form. Giải pháp đơn giản nhất cho MVP.

**How to apply:** Nếu ai hỏi "respondent có cần đăng nhập không" — không cần trong Sprint 1, anonymous hoàn toàn.

---

**Draft expiry policy**: Draft KHÔNG bị xóa tự động trong Sprint 1. Chính sách "xóa sau 30 ngày không submit" sẽ implement sau với pg-boss job.

**Why:** Tránh phức tạp hóa Sprint 1. pg-boss job cleanup là infrastructure concern.

**How to apply:** Nếu hỏi về draft cleanup — chưa có trong Sprint 1, sẽ làm ở sprint sau.

---

**Form status lifecycle**: `draft` → `published` → `closed`. Unpublish đưa về `draft`. Close là trạng thái cuối (vẫn đọc được responses nhưng không nhận thêm).

**Why:** Cần phân biệt rõ "đang chỉnh sửa" vs "đã đóng" để tránh nhầm lẫn cho owner.

**How to apply:** 3 trạng thái này là chuẩn cho toàn bộ dự án — nhất quán xuyên suốt.

---

**Pricing gating**: Chưa enforce trong Sprint 1. Free tier limit (3 forms, 100 responses) sẽ làm trong Sprint 6.

**Why:** Tập trung vào core flow trước. Pricing logic thêm complexity không cần thiết ở MVP.

---

**Features explicitly out of scope Sprint 1**: Logic điều kiện (if/then), Analytics/funnel, Embed widget, Custom branding/theme, Export CSV, File upload, Pricing gating, Custom URL slug, OAuth login.

See also: [[sprint1-story-list]]
