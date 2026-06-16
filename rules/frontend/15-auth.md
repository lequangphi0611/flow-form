# 15 — Auth & Route Protection

## Kiến trúc auth trong FlowForm

```
Browser
  │
  ├── middleware.ts          ← Check cookie tồn tại (edge runtime, không có DB)
  │     ↓ redirect /login nếu không có cookie
  │
  ├── Server Component       ← Gọi auth API để lấy session đầy đủ (userId, email...)
  │     └── getSession()     ← fetch NestJS /api/auth/get-session với cookie
  │
  └── Client Component       ← useSession() từ better-auth/react
```

---

## 1. `middleware.ts` — Bảo vệ route ở tầng Edge

```ts
// ✅ — src/middleware.ts (đặt ở root của apps/web/src/)
import { NextRequest, NextResponse } from 'next/server'

// Routes không cần đăng nhập
const PUBLIC_PREFIXES = ['/login', '/register', '/f/', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cho phép public routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Check cookie tồn tại — edge compatible, không gọi DB
  const sessionCookie = request.cookies.get('better-auth.session_token')

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Chạy trên mọi route trừ static files và _next internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
}
```

**Quy tắc:**
- Middleware chỉ check cookie **tồn tại** — không validate session (không có DB access ở edge)
- Không thêm auth logic vào từng `layout.tsx` hay `page.tsx` — middleware là tầng duy nhất
- Public routes: `/login`, `/register`, `/f/*` (public form), `/api/auth/*` (better-auth handler)

---

## 2. `getSession()` — Lấy session đầy đủ trong Server Component

Middleware chỉ check cookie tồn tại. Để lấy `userId`, `email`, v.v. trong Server Component, gọi NestJS auth API.

```ts
// ✅ — src/lib/auth-server.ts
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export interface Session {
  user: {
    id: string
    email: string
    name: string
  }
  session: {
    id: string
    expiresAt: string
  }
}

// Dùng trong Server Component để lấy session đầy đủ
export async function getSession(): Promise<Session | null> {
  const headersList = await headers()

  const res = await fetch(`${process.env.API_URL}/api/auth/get-session`, {
    headers: {
      cookie: headersList.get('cookie') ?? '',  // forward cookie từ browser
    },
    cache: 'no-store',  // session phải luôn fresh
  })

  if (!res.ok) return null
  return res.json()
}

// Shorthand: lấy session hoặc redirect — dùng trong pages cần userId
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
```

```tsx
// ✅ — Dùng trong Server Component cần userId
// src/app/(dashboard)/forms/page.tsx
import { requireSession } from '@/lib/auth-server'
import { getForms } from '@/lib/data/forms'

export default async function FormsPage() {
  const session = await requireSession()  // redirect /login nếu session hết hạn
  const forms = await getForms(session.user.id)

  return <FormGrid forms={forms} />
}
```

```tsx
// ❌ — Gọi useSession() trong Server Component
export default async function FormsPage() {
  const { data: session } = useSession()  // ❌ hooks không chạy ở Server Component
}
```

---

## 3. `useSession()` — Session trong Client Component

```tsx
// ✅ — Client Component dùng useSession từ auth-client
'use client'

import { useSession } from '@/lib/auth-client'

export function UserMenu() {
  const { data: session, isPending } = useSession()

  if (isPending) return <Skeleton className="h-8 w-8 rounded-full" />
  if (!session) return null  // middleware đã handle redirect — trường hợp này hiếm

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{session.user.name}</span>
      <SignOutButton />
    </div>
  )
}
```

---

## 4. Login/Register page — tách Container + Presenter (xem rule 08)

Auth pages dùng `signIn.email()`, `signUp.email()`, `router.push()` → **bắt buộc tách Container/Presenter** theo rule 08.

```
components/auth/containers/LoginContainer.tsx   ← gọi signIn.email(), router.push()
components/auth/LoginForm.tsx                   ← nhận { isPending, onSubmit, error } qua props
app/(auth)/login/page.tsx                       ← chỉ import LoginContainer, không có logic
```

```tsx
// ✅ — components/auth/containers/LoginContainer.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { toast } from 'sonner'
import { LoginForm } from '../LoginForm'

export function LoginContainer() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(email: string, password: string) {
    setIsPending(true)
    setError(null)

    const { error: signInError } = await signIn.email({ email, password })

    if (signInError) {
      setError('Email hoặc mật khẩu không đúng')
      setIsPending(false)
      return
    }

    router.push('/forms')  // luôn redirect về /forms sau login
  }

  return <LoginForm isPending={isPending} error={error} onSubmit={handleSubmit} />
}
```

```tsx
// ✅ — components/auth/LoginForm.tsx (Presenter)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})
type LoginInput = z.infer<typeof loginSchema>

interface LoginFormProps {
  isPending: boolean
  error: string | null
  onSubmit: (email: string, password: string) => void
}

export function LoginForm({ isPending, error, onSubmit }: LoginFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Đăng nhập</h1>
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit((d) => onSubmit(d.email, d.password))} className="space-y-4">
          <div>
            <input {...register('email')} type="email" placeholder="Email"
              className="w-full h-10 px-3 border rounded-md text-sm" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('password')} type="password" placeholder="Mật khẩu"
              className="w-full h-10 px-3 border rounded-md text-sm" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isPending}
            className="w-full h-10 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
            {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

```tsx
// ✅ — app/(auth)/login/page.tsx — chỉ mount Container, không có logic
import { LoginContainer } from '@/components/auth/containers/LoginContainer'

export default function LoginPage() {
  return <LoginContainer />
}
```

```tsx
// ❌ — SAI: page.tsx vừa gọi signIn.email() vừa render form UI
// app/(auth)/login/page.tsx
'use client'
export default function LoginPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e) {
    // ... gọi signIn.email() ở đây  ← logic thuộc Container
  }

  return (
    <form onSubmit={handleSubmit}>  {/* ← UI thuộc Presenter */}
      ...
    </form>
  )
}
// Vi phạm rule 08 — trộn lẫn Container + Presenter trong 1 file
```

---

## 5. Sign out

```tsx
// ✅ — SignOutButton
'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
      Đăng xuất
    </button>
  )
}
```

---

## Những điều KHÔNG làm

```ts
// ❌ — Check auth trong từng layout.tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await getSession()
  if (!session) redirect('/login')  // ❌ duplicate — middleware đã làm điều này
  return <div>{children}</div>
}
```

```ts
// ❌ — Validate session trong middleware (không có DB access ở edge)
export async function middleware(request: NextRequest) {
  const session = await prisma.session.findFirst(...)  // ❌ không chạy được ở edge
}
```

```ts
// ❌ — Để /api/auth/* bị protect bởi middleware
// Better Auth cần handle /api/auth/* trước khi middleware check session
// → đã có PUBLIC_PREFIXES bao gồm '/api/auth'
```
