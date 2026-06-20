import { useQuery } from '@tanstack/react-query'

import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import { useCurrentUser } from '@/hooks/auth/useCurrentUser'

export function useFormList() {
  const { data, isPending: isSessionPending } = useCurrentUser()
  const userId = data?.user?.id ?? ''

  const query = useQuery({
    queryKey: formKeys.all(userId),
    queryFn: formsApi.list,
    enabled: !!userId,
  })

  return {
    ...query,
    isLoading: isSessionPending || query.isLoading,
  }
}
