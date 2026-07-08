export const formKeys = {
  root: ['forms'] as const,
  all: (userId: string) => ['forms', userId] as const,
  detail: (id: string) => ['forms', id] as const,
  analytics: (id: string) => ['forms', id, 'analytics'] as const,
  responses: (id: string) => ['forms', id, 'responses'] as const,
}
