'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { signOut } from '@/lib/auth-client'
import { SignOutButton } from './SignOutButton'

export function SignOutButtonContainer() {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleSignOut() {
    await signOut()
    queryClient.clear()
    router.push('/login')
  }

  return <SignOutButton onSignOut={handleSignOut} />
}
