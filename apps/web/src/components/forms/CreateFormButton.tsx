'use client'

import { Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { formsApi } from '@/lib/api/forms'

export function CreateFormButton() {
  const router = useRouter()

  const { mutate, isPending } = useMutation({
    mutationFn: () => formsApi.create({ title: 'Form chưa có tên' }),
    onSuccess: (data) => router.push(`/forms/${data.id}/builder`),
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
