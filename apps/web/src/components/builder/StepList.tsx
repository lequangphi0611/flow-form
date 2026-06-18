'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useBuilderStore } from '@/store/builder.store'
import { Button } from '@/components/ui/button'
import { StepItem } from './StepItem'
import type { StepSchema } from '@flowform/types'

const EMPTY_STEPS: StepSchema[] = []

export function StepList() {
  const steps = useBuilderStore((s) => s.form?.steps ?? EMPTY_STEPS)
  const addStep = useBuilderStore((s) => s.addStep)
  const stepIds = steps.map((s) => s.id)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Các bước</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1">
            {steps.map((step, index) => (
              <StepItem key={step.id} step={step} index={index} />
            ))}
          </ul>
        </SortableContext>
      </div>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-gray-600"
          onClick={addStep}
        >
          <Plus className="h-4 w-4" />
          Thêm bước
        </Button>
      </div>
    </div>
  )
}
