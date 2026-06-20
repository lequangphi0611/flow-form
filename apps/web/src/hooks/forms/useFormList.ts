import { useQuery } from '@tanstack/react-query'

import type { FormSchema } from '@flowform/types'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

// Coi initialData từ server là fresh trong khoảng này → không refetch nền ngay khi
// mount (default staleTime=0 sẽ refetch, gây double fetch). Create/delete vẫn
// invalidate tường minh nên list vẫn cập nhật bất kể staleTime.
const FORMS_STALE_TIME_MS = 60_000

// Hybrid: userId + initialForms đến từ Server Component → không còn waterfall
// session→list ở client, cũng không double fetch. TanStack Query lo invalidate sau mutation.
export function useFormList(userId: string, initialForms: FormSchema[]) {
  return useQuery({
    queryKey: formKeys.all(userId),
    queryFn: formsApi.list,
    initialData: initialForms,
    staleTime: FORMS_STALE_TIME_MS,
  })
}
