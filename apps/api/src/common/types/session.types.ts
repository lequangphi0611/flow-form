export interface SessionUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
}

declare module 'express' {
  interface Request {
    user?: SessionUser
  }
}
