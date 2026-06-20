'use client'

import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

import { Button } from '@/components/ui/button'

import { StepListContainer } from '../StepList'
import { FieldCanvasContainer } from '../FieldCanvas'
import { FieldSettingsContainer } from '../FieldSettings'
import { SaveStatus } from '../SaveStatus'
import { FormTitleInputContainer } from '../FormTitleInput'
import type { SaveStatusValue } from '../hooks/useAutoSave'

interface BuilderLayoutProps {
  saveStatus: SaveStatusValue
  onDragEnd: (event: DragEndEvent) => void
}

export function BuilderLayout({ saveStatus, onDragEnd }: BuilderLayoutProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col w-full h-full">
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/forms">← Quay lại</Link>
            </Button>
            <FormTitleInputContainer />
          </div>
          <SaveStatus status={saveStatus} />
        </header>

        <div className="flex flex-1 min-h-0">
          <aside className="w-64 border-r bg-white overflow-y-auto">
            <StepListContainer />
          </aside>

          <main className="flex-1 bg-gray-100 overflow-y-auto">
            <FieldCanvasContainer />
          </main>

          <aside className="w-72 border-l bg-white overflow-y-auto">
            <FieldSettingsContainer />
          </aside>
        </div>
      </div>
    </DndContext>
  )
}
