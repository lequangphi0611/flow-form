'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBuilderStore } from '@/store/builder.store'
import { Button } from '@/components/ui/button'
import type { FieldSchema } from '@flowform/types'

const FIELD_TYPE_LABELS: Record<FieldSchema['type'], string> = {
  text: 'Text',
  email: 'Email',
  number: 'Số',
  date: 'Ngày',
  textarea: 'Textarea',
  select: 'Dropdown',
  multiselect: 'Multi-select',
  rating: 'Rating',
  radio: 'Yes/No',
  phone: 'Phone',
  file: 'File',
  checkbox: 'Checkbox',
  signature: 'Chữ ký',
}

interface FieldCardProps {
  stepId: string
  field: FieldSchema
  index: number
}

export const FieldCard = memo(function FieldCard({ stepId, field, index }: FieldCardProps) {
  const selectField = useBuilderStore((s) => s.selectField)
  const removeField = useBuilderStore((s) => s.removeField)
  const isSelected = useBuilderStore((s) => s.selectedFieldId === field.id)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { type: 'FIELD', index, field, stepId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => selectField(field.id)}
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150',
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

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{field.label}</p>
        </div>

        <span className="text-xs text-gray-400 shrink-0">
          {FIELD_TYPE_LABELS[field.type] ?? field.type}
        </span>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Xóa field"
          onClick={(e) => {
            e.stopPropagation()
            removeField(stepId, field.id)
          }}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </li>
  )
})
