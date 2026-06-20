import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// better-auth is ESM-only; new Function prevents TypeScript from rewriting
// import() to require() when targeting CommonJS
const _esmImport = new Function('id', 'return import(id)') as (id: string) => Promise<any>

async function createAuth() {
  const { betterAuth } = (await _esmImport('better-auth')) as typeof import('better-auth')
  const { prismaAdapter } = (await _esmImport('better-auth/adapters/prisma')) as typeof import('better-auth/adapters/prisma')

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
    emailAndPassword: { enabled: true },
  })
}

type AuthInstance = Awaited<ReturnType<typeof createAuth>>

let _auth: AuthInstance | null = null

export async function getAuth(): Promise<AuthInstance> {
  if (!_auth) {
    _auth = await createAuth()
  }
  return _auth
}
