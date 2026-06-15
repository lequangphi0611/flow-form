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

## 3. Cloudflare R2 — File storage miễn phí

> Bỏ qua bước này nếu chưa cần tính năng upload file. App vẫn chạy được.

1. Tạo tài khoản tại [cloudflare.com](https://cloudflare.com) (free)
2. Vào **R2 Object Storage → Create bucket** → đặt tên `flowform`
3. Vào **Manage R2 API Tokens → Create API Token**
   - Permissions: `Object Read & Write`
   - Scope: `Specific bucket → flowform`
4. Lưu lại:
   - `Account ID` (góc phải dashboard)
   - `Access Key ID`
   - `Secret Access Key`
5. Để public URL: vào bucket → **Settings → Public Access** → bật và copy domain

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

# Từ bước 3 (để trống nếu bỏ qua bước 3)
CLOUDFLARE_R2_ACCOUNT_ID=""
CLOUDFLARE_R2_ACCESS_KEY_ID=""
CLOUDFLARE_R2_SECRET_ACCESS_KEY=""
CLOUDFLARE_R2_BUCKET_NAME="flowform"
CLOUDFLARE_R2_PUBLIC_URL=""
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
| File storage | Cloudflare R2 | Đã setup ở bước 3 |
| Keep-alive | UptimeRobot | Monitor URL `https://your-api.render.com/api`, interval 5 phút |

> **Biến môi trường khi deploy:** Điền vào Vercel Dashboard và Render Dashboard thay vì file `.env`.
