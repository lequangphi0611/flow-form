import { useMutation } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import type { FormSchema } from '@flowform/types'

const DEFAULT_FORM_TITLE = 'Form chưa có tên'

export function useCreateForm(options?: { onSuccess?: (form: FormSchema) => void }) {
  return useMutation({
    mutationFn: () => formsApi.create({ title: DEFAULT_FORM_TITLE }),
    onSuccess: (form) => {
      options?.onSuccess?.(form)
    },
  })
}
