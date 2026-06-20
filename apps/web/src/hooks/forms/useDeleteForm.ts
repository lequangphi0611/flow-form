import { useMutation, useQueryClient } from '@tanstack/react-query'

import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useDeleteForm(options?: {
  onSuccess?: () => void
  onError?: () => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.root })
      options?.onSuccess?.()
    },
    onError: () => {
      options?.onError?.()
    },
  })
}
