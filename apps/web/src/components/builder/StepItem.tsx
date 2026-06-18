'use client'

import { memo, useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBuilderStore } from '@/store/builder.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StepSchema } from '@flowform/types'

interface StepItemProps {
  step: StepSchema
  index: number
}

export const StepItem = memo(function StepItem({ step, index }: StepItemProps) {
  const selectStep = useBuilderStore((s) => s.selectStep)
  const removeStep = useBuilderStore((s) => s.removeStep)
  const updateStep = useBuilderStore((s) => s.updateStep)
  const isSelected = useBuilderStore((s) => s.selectedStepId === step.id)
  const isOnlyStep = useBuilderStore((s) => (s.form?.steps.length ?? 0) <= 1)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(step.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    data: { type: 'STEP', index, step },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function startEditing() {
    setEditTitle(step.title)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function confirmEdit() {
    const trimmed = editTitle.trim()
    if (trimmed) {
      updateStep(step.id, { title: trimmed })
    } else {
      setEditTitle(step.title)
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') {
      setEditTitle(step.title)
      setIsEditing(false)
    }
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => !isEditing && selectStep(step.id)}
        className={cn(
          'group flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors duration-150',
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:bg-gray-50',
        )}
      >
        <span
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="flex-1 min-w-0" onDoubleClick={startEditing}>
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-6 py-0 px-1 text-sm border-blue-400"
            />
          ) : (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{step.title}</p>
              <p className="text-xs text-gray-400">{step.fields.length} trường</p>
            </div>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xóa bước"
                  disabled={isOnlyStep}
                  onClick={() => removeStep(step.id)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            </TooltipTrigger>
            {isOnlyStep && (
              <TooltipContent>
                <p>Không thể xóa bước duy nhất</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </li>
  )
})
