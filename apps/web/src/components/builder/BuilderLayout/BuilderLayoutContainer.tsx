'use client'

import { useEffect, useRef } from 'react'
import { type DragEndEvent } from '@dnd-kit/core'

import { useBuilderStore } from '@/store/builder.store'
import { useFormForEditor } from '@/hooks/forms/useFormForEditor'
import { useAutoSave } from '../hooks/useAutoSave'

import { BuilderLayout } from './BuilderLayout'

interface BuilderLayoutContainerProps {
  formId: string
}

export function BuilderLayoutContainer({ formId }: BuilderLayoutContainerProps) {
  const setForm = useBuilderStore((s) => s.setForm)
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)
  const reorderFields = useBuilderStore((s) => s.reorderFields)
  const saveStatus = useAutoSave(formId)

  const { data, isLoading, isError } = useFormForEditor(formId)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (data && !hasInitialized.current) {
      hasInitialized.current = true
      setForm(data)
    }
  }, [data, setForm])

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dragType = active.data.current?.type

    if (dragType === 'STEP') {
      const fromIndex = active.data.current?.index as number
      const toIndex = over.data.current?.index as number
      if (typeof fromIndex === 'number' && typeof toIndex === 'number') {
        reorderSteps(fromIndex, toIndex)
      }
    }

    if (dragType === 'FIELD') {
      const stepId = active.data.current?.stepId as string
      const fromIndex = active.data.current?.index as number
      const toIndex = over.data.current?.index as number
      if (stepId && typeof fromIndex === 'number' && typeof toIndex === 'number') {
        reorderFields(stepId, fromIndex, toIndex)
      }
    }
  }

  if (isLoading) return <BuilderSkeleton />

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-red-600">Không thể tải form. Thử lại sau.</p>
      </div>
    )
  }

  return <BuilderLayout saveStatus={saveStatus} onDragEnd={onDragEnd} />
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
