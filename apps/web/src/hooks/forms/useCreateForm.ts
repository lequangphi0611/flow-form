import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import type { FormSchema } from '@flowform/types'

const DEFAULT_FORM_TITLE = 'Form chưa có tên'

export function useCreateForm(options?: { onSuccess?: (form: FormSchema) => void }) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => formsApi.create({ title: DEFAULT_FORM_TITLE }),
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: formKeys.root })
      options?.onSuccess?.(form)
    },
  })
}
