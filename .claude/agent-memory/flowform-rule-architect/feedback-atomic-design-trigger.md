---
name: feedback-atomic-design-trigger
description: Rule 09 atomic design không trigger khi tạo component mới — fix bằng checklist inline trong CLAUDE.md
metadata:
  type: feedback
---

Rule 09 (atomic-design) bị bỏ qua khi implement US-001 (auth form) vì điều kiện trigger trong bảng CODING RULES quá trừu tượng ("Phân loại component: Atom / Molecule / Organism / Page"). Claude không đặt câu hỏi "component này thuộc tầng nào?" — nó đặt câu hỏi "feature này cần file ở đâu?" và đặt thẳng vào `app/(auth)/register/_components/`.

**Why:** Hai lỗ hổng kết hợp nhau:
1. Điều kiện trigger dùng ngôn ngữ kiến trúc thay vì ngôn ngữ hành động ("tạo component mới").
2. Phần CẤU TRÚC THƯ MỤC trong CLAUDE.md không liệt kê `components/ui/`, `components/common/`, `components/[feature]/` — Claude không có mental model về nơi đặt component.

**How to apply:** Khi viết hoặc review điều kiện trigger cho rule về tổ chức file/component, dùng ngôn ngữ hành động cụ thể ("Tạo component mới bất kỳ") thay vì tên khái niệm ("Phân loại component"). Luôn đảm bảo phần CẤU TRÚC THƯ MỤC trong CLAUDE.md phản ánh đầy đủ cây `components/` với annotation tầng (ATOM/MOLECULE/ORGANISM).

Fix đã áp dụng trong `apps/web/CLAUDE.md`:
- Điều kiện trigger rule 09 đổi thành "**Tạo component mới bất kỳ** — quyết định đặt file ở đâu trong `components/`"
- Thêm checklist 5 bước inline vào mục QUY TẮC QUAN TRỌNG (không cần mở file rule để biết đặt file ở đâu)
- Cập nhật CẤU TRÚC THƯ MỤC để hiển thị đầy đủ `components/ui/`, `components/common/`, `components/auth/`, v.v.
- Thêm cảnh báo tường minh: không đặt component vào `app/**/[route]/_components/`

[[feedback-rule-trigger-language]]
