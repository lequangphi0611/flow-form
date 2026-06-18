'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useBuilderStore } from '@/store/builder.store'
import { formsApi } from '@/lib/api/forms'
import { formKeys } from '@/lib/query-keys'
import { useAutoSave } from '../hooks/useAutoSave'
import { BuilderLayout } from '../BuilderLayout'

interface BuilderContainerProps {
  formId: string
}

export function BuilderContainer({ formId }: BuilderContainerProps) {
  const setForm = useBuilderStore((s) => s.setForm)
  const formTitle = useBuilderStore((s) => s.form?.title ?? '')
  const saveStatus = useAutoSave(formId)

  const { data, isLoading, isError } = useQuery({
    queryKey: formKeys.editor(formId),
    queryFn: () => formsApi.getForEditor(formId),
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data, setForm])

  if (isLoading) return <BuilderSkeleton />
  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-red-600">Không thể tải form. Thử lại sau.</p>
      </div>
    )
  }

  return <BuilderLayout formId={formId} formTitle={formTitle} saveStatus={saveStatus} />
}

function BuilderSkeleton() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="h-14 border-b bg-white shrink-0" />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 border-r bg-white" />
        <div className="flex-1 bg-gray-100" />
        <div className="w-72 border-l bg-white" />
      </div>
    </div>
  )
}
