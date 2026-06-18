'use client'

import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useBuilderStore } from '@/store/builder.store'
import { Button } from '@/components/ui/button'
import { StepList } from './StepList'
import { FieldCanvas } from './FieldCanvas'
import { FieldSettings } from './FieldSettings'
import { SaveStatus } from './SaveStatus'
import type { SaveStatusValue } from './hooks/useAutoSave'

interface BuilderLayoutProps {
  formId: string
  formTitle: string
  saveStatus: SaveStatusValue
}

export function BuilderLayout({ formTitle, saveStatus }: BuilderLayoutProps) {
  const reorderSteps = useBuilderStore((s) => s.reorderSteps)
  const reorderFields = useBuilderStore((s) => s.reorderFields)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

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

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col w-full h-full">
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/forms">← Quay lại</Link>
            </Button>
            <span className="text-lg font-semibold text-gray-900 truncate max-w-xs">
              {formTitle}
            </span>
          </div>
          <SaveStatus status={saveStatus} />
        </header>

        <div className="flex flex-1 min-h-0">
          <aside className="w-64 border-r bg-white overflow-y-auto">
            <StepList />
          </aside>

          <main className="flex-1 bg-gray-100 overflow-y-auto">
            <FieldCanvas />
          </main>

          <aside className="w-72 border-l bg-white overflow-y-auto">
            <FieldSettings />
          </aside>
        </div>
      </div>
    </DndContext>
  )
}
