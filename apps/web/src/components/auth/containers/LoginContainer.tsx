'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
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

    router.push('/forms')
  }

  return <LoginForm isPending={isPending} error={error} onSubmit={handleSubmit} />
}
