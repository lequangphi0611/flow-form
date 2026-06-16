'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'
import { RegisterForm } from '../RegisterForm'

export function RegisterContainer() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>()

  async function handleSubmit(data: { name: string; email: string; password: string }) {
    setIsPending(true)
    setEmailError(undefined)

    const { error } = await signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    })

    if (error) {
      setEmailError('Email này đã được sử dụng')
      setIsPending(false)
      return
    }

    router.push('/forms')
  }

  return (
    <RegisterForm
      isPending={isPending}
      emailError={emailError}
      onSubmit={handleSubmit}
    />
  )
}
