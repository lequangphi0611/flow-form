'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { signIn } from '@/lib/auth-client'
import { sessionKeys } from '@/hooks/auth/useCurrentUser'
import { LoginForm } from '../LoginForm'

export function LoginContainer() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(email: string, password: string) {
    setIsPending(true)
    setError(null)

    try {
      const { error: signInError } = await signIn.email({ email, password })
      if (signInError) {
        setError('Email hoặc mật khẩu không đúng')
        return
      }
      queryClient.invalidateQueries({ queryKey: sessionKeys.current })
      router.push('/forms')
    } catch {
      setError('Đã có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setIsPending(false)
    }
  }

  return <LoginForm isPending={isPending} error={error} onSubmit={handleSubmit} />
}
