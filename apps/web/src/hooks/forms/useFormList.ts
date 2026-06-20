import { useQuery } from '@tanstack/react-query'

import type { FormSchema } from '@flowform/types'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

// Hybrid: userId + initialForms đến từ Server Component → không còn waterfall
// session→list ở client. TanStack Query vẫn lo refetch/invalidate sau mutation.
export function useFormList(userId: string, initialForms: FormSchema[]) {
  return useQuery({
    queryKey: formKeys.all(userId),
    queryFn: formsApi.list,
    initialData: initialForms,
  })
}
