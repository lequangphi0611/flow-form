import { QueryClient } from '@tanstack/react-query'

// Singleton for server components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
})
