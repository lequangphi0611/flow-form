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
    staleTime: 5 * 60 * 1000, // 5 phút — session không đổi thường xuyên
    gcTime: 10 * 60 * 1000,   // giữ cache 10 phút sau khi component unmount
    retry: false,               // session 401 không cần retry
  })
}
