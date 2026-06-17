'use client'

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleSignOut() {
    await signOut()
    queryClient.clear()
    router.push('/login')
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      Đăng xuất
    </Button>
  )
}
