'use client'

import { Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/hooks/forms/useCreateForm'

export function CreateFormButton() {
  const router = useRouter()

  const { mutate, isPending } = useCreateForm({
    onSuccess: (form) => router.push(`/forms/${form.id}/builder`),
  })

  return (
    <Button onClick={() => mutate()} disabled={isPending} aria-busy={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Đang tạo...' : 'Tạo form mới'}
    </Button>
  )
}
