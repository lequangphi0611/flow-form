import { useQuery } from '@tanstack/react-query'

import { authClient } from '@/lib/auth-client'

export const sessionKeys = {
  current: ['session'] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: sessionKeys.current,
    queryFn: async () => {
      const result = await authClient.getSession()
      return result.data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })
}
