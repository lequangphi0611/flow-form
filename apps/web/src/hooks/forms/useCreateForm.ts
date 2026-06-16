import { useMutation } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import type { FormSchema } from '@flowform/types'

export function useCreateForm(options?: { onSuccess?: (form: FormSchema) => void }) {
  return useMutation({
    mutationFn: () => formsApi.create({ title: 'Form chưa có tên' }),
    onSuccess: (form) => {
      options?.onSuccess?.(form)
    },
  })
}
