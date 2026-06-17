export const formKeys = {
  all: ['forms'] as const,
  detail: (id: string) => ['forms', id] as const,
  analytics: (id: string) => ['forms', id, 'analytics'] as const,
  responses: (id: string) => ['forms', id, 'responses'] as const,
}
