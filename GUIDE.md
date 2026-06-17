# FlowForm — Setup Guide

> Làm theo đúng thứ tự. Mỗi bước đánh dấu ✅ khi xong.

---

## 1. Yêu cầu hệ thống

- **Node.js** >= 20.19.0 — [nodejs.org](https://nodejs.org)
- **npm** >= 10 (đi kèm Node.js)

Kiểm tra:
```bash
node -v
npm -v
```

---

## 2. Neon — PostgreSQL miễn phí

1. Tạo tài khoản tại [neon.tech](https://neon.tech)
2. Tạo project mới → đặt tên `flowform`
3. Chọn region gần nhất (Singapore hoặc Tokyo)
4. Vào **Dashboard → Connection string** → copy chuỗi dạng:
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/flowform?sslmode=require
   ```
5. Lưu lại — dùng ở bước 4

---

## 3. Supabase Storage — File storage miễn phí

> Bỏ qua bước này nếu chưa cần tính năng upload file. App vẫn chạy được.

> **Free tier** — 1 GB storage, 2 GB/tháng bandwidth, không cần credit card.

1. Tạo tài khoản tại [supabase.com](https://supabase.com) → **New project** → đặt tên `flowform`
   - Chọn region gần nhất (Singapore)
   - Đặt Database Password (lưu lại, dùng sau)
2. Đợi project khởi tạo (~2 phút), sau đó vào **Project Settings → API** và lưu lại:
   - **Project URL** → `SUPABASE_URL`
   - **`service_role`** key (mục *Project API Keys*) → `SUPABASE_SERVICE_ROLE_KEY`
3. Vào **Storage → New bucket**:
   - Đặt tên bucket (ví dụ: `uploads`)
   - Bật **Public bucket** → **Save**

> **Lưu ý:** Bucket phải là **Public** để `getPublicUrl()` trả về URL trực tiếp mà không cần signed URL.

---

## 4. Tạo file `.env`

### 4a. API (`apps/api/.env`)

```bash
# Tạo từ template
cp apps/api/.env.example apps/api/.env
```

Mở `apps/api/.env` và điền:

```env
# Dán connection string từ bước 2
DATABASE_URL="postgresql://..."

# Sinh ngẫu nhiên — chạy lệnh này và paste kết quả vào
# openssl rand -base64 32
BETTER_AUTH_SECRET="..."

BETTER_AUTH_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# Từ bước 3 (để trống nếu bỏ qua bước 3 — app vẫn chạy, chỉ mất tính năng upload)
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="uploads"
```

> **Tạo BETTER_AUTH_SECRET trên Windows (không có openssl):**
> ```powershell
> [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
> ```

### 4b. Web (`apps/web/.env.local`)

```bash
cp .env.example apps/web/.env.local
```

Mở `apps/web/.env.local` và điền:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 5. Cài dependencies

```bash
# Từ thư mục gốc (cài tất cả apps + packages cùng lúc)
npm install
```

---

## 6. Setup database

```bash
cd apps/api

# Tạo Prisma Client từ schema
npm run db:generate

# Tạo tất cả tables trên Neon (không cần migration file)
npm run db:push
```

Kiểm tra tables đã được tạo:
```bash
npm run db:studio
# Mở http://localhost:5555 — thấy các bảng User, Form, FormResponse... là thành công
```

---

## 7. Setup shadcn/ui

```bash
cd ../web   # hoặc cd apps/web từ root

npx shadcn@latest init
```

Trả lời các câu hỏi:
- Style: **Default**
- Base color: **Slate** (hoặc tùy chọn)
- CSS variables: **Yes**

Thêm các component cần thiết ban đầu:
```bash
npx shadcn@latest add button input label card dialog sheet tabs separator
```

---

## 8. Chạy app

Mở **3 terminal** (hoặc dùng 1 terminal từ root):

### Option A — Chạy tất cả cùng lúc (Turborepo)
```bash
# Từ thư mục gốc
npm run dev
```
- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)
- Embed: [http://localhost:5173](http://localhost:5173)

### Option B — Chạy riêng từng app
```bash
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Web
cd apps/web && npm run dev

# Terminal 3 — Embed (chỉ khi cần dev widget)
cd apps/embed && npm run dev
```

---

## 9. Kiểm tra mọi thứ hoạt động

- [ ] `http://localhost:3001/api` — trả về 404 (NestJS đang chạy)
- [ ] `http://localhost:3000` — redirect đến `/forms`
- [ ] `http://localhost:3001/api/auth/get-session` — trả về `{ session: null }`
- [ ] Prisma Studio `http://localhost:5555` — thấy các bảng trống

---

## Lệnh hữu ích

```bash
# Xem log của Neon DB qua Prisma Studio
cd apps/api && npm run db:studio

# Tạo migration mới sau khi sửa prisma/schema.prisma
cd apps/api && npm run db:migrate

# Build toàn bộ
npm run build

# Build embed widget (output: apps/embed/dist/flowform-embed.iife.js)
cd apps/embed && npm run build
```

---

## Khi deploy (sau này)

| Thành phần | Deploy lên | Ghi chú |
|---|---|---|
| `apps/web` | Vercel | Connect GitHub repo, auto-detect Next.js |
| `apps/api` | Render | Web Service, Node runtime, port 3001 |
| Database | Neon | Dùng production branch thay vì main |
| File storage | Supabase Storage (Free) | Đã setup ở bước 3 — dùng SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY |
| Keep-alive | UptimeRobot | Monitor URL `https://your-api.render.com/api`, interval 5 phút |

> **Biến môi trường khi deploy:** Điền vào Vercel Dashboard và Render Dashboard thay vì file `.env`.
