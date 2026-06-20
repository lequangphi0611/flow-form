'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { StepItemContainer } from '../StepItem'

interface StepListProps {
  stepIds: string[]
  onAddStep: () => void
}

export function StepList({ stepIds, onAddStep }: StepListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Các bước</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1">
            {stepIds.map((stepId, index) => (
              <StepItemContainer key={stepId} stepId={stepId} index={index} />
            ))}
          </ul>
        </SortableContext>
      </div>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-gray-600"
          onClick={onAddStep}
        >
          <Plus className="h-4 w-4" />
          Thêm bước
        </Button>
      </div>
    </div>
  )
}
