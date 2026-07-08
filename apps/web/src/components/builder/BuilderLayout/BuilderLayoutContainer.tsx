'use client'

import { useEffect, useState } from 'react'
import { type DragEndEvent } from '@dnd-kit/core'

import type { FormSchema } from '@flowform/types'
import { useBuilderStore } from '@/store/builder.store'
import { useAutoSave } from '../hooks/useAutoSave'

import { BuilderLayout } from './BuilderLayout'

interface BuilderLayoutContainerProps {
  // Form đã được fetch ở Server Component (hybrid) và truyền xuống — client không
  // tự fetch lại để tránh round-trip thừa và double source-of-truth với store.
  initialForm: FormSchema
}

export function BuilderLayoutContainer({ initialForm }: BuilderLayoutContainerProps) {
  const setForm = useBuilderStore((s) => s.setForm)
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)
  const reorderFields = useBuilderStore((s) => s.reorderFields)
  const saveStatus = useAutoSave(initialForm.id)

  const [isReady, setIsReady] = useState(false)

  // Seed store từ initialForm một lần khi mount (hoặc khi điều hướng sang form khác).
  // initialForm là object mới mỗi lần navigate nên effect chạy lại đúng lúc cần.
  useEffect(() => {
    setForm(initialForm)
    setIsReady(true)
  }, [initialForm, setForm])

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

  // Lỗi tải form (404/403/khác) đã được xử lý ở Server Component (notFound/error.tsx).
  // Ở client chỉ còn 1 nhịp chờ store được seed — không có network request nào ở đây.
  if (!isReady) return <BuilderSkeleton />

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
