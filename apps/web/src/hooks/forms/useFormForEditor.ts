'use client'

import { useQuery } from '@tanstack/react-query'

import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'

export function useFormForEditor(formId: string) {
  return useQuery({
    queryKey: formKeys.editor(formId),
    queryFn: () => formsApi.getForEditor(formId),
    // Prevent background refetch from overwriting unsaved local changes in the builder store
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
