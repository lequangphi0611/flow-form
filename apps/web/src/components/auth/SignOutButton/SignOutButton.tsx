import { Button } from '@/components/ui/button'

interface SignOutButtonProps {
  onSignOut: () => void
}

export function SignOutButton({ onSignOut }: SignOutButtonProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onSignOut}>
      Đăng xuất
    </Button>
  )
}
