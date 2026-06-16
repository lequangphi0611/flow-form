import { useQuery } from '@tanstack/react-query'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useFormList() {
  return useQuery({
    queryKey: formKeys.all,
    queryFn: formsApi.list,
  })
}
