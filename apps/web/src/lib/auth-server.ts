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

export async function getSession(): Promise<Session | null> {
  const headersList = await headers()

  const res = await fetch(`${process.env.API_URL}/api/auth/get-session`, {
    headers: {
      cookie: headersList.get('cookie') ?? '',
    },
    cache: 'no-store',
  })

  if (!res.ok) return null
  return res.json()
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
