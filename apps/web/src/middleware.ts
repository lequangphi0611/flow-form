import { NextRequest, NextResponse } from 'next/server'

const AUTH_PAGES = ['/login', '/register']
const PUBLIC_PREFIXES = ['/f/', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('better-auth.session_token')

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Auth pages: đã đăng nhập rồi thì redirect về dashboard
  if (AUTH_PAGES.some((page) => pathname.startsWith(page))) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/forms', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes: chưa đăng nhập thì redirect về login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
}
