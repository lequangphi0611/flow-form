'use client'

import Link from 'next/link'
import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'

interface BuilderLayoutProps {
  formId: string
  formTitle: string
}

export function BuilderLayout({ formTitle }: BuilderLayoutProps) {
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // US-004b wires reorderSteps() here
    // US-004c wires reorderFields() here
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
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
        </header>

        <div className="flex flex-1 min-h-0">
          <aside className="w-64 border-r bg-white overflow-y-auto">
            {/* StepList — US-004b */}
          </aside>

          <main className="flex-1 bg-gray-100 overflow-y-auto p-4">
            {/* FieldCanvas — US-004c */}
          </main>

          <aside className="w-72 border-l bg-white overflow-y-auto">
            {/* FieldSettings — US-004c */}
          </aside>
        </div>
      </div>
    </DndContext>
  )
}
