'use client'

import {
  Type,
  Mail,
  Hash,
  Calendar,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Star,
  ToggleLeft,
} from 'lucide-react'
import { useBuilderStore } from '@/store/builder.store'
import { Button } from '@/components/ui/button'
import type { FieldSchema } from '@flowform/types'

const FIELD_TYPES: Array<{
  type: FieldSchema['type']
  label: string
  icon: React.ElementType
}> = [
  { type: 'text',        label: 'Text',        icon: Type },
  { type: 'email',       label: 'Email',       icon: Mail },
  { type: 'number',      label: 'Số',          icon: Hash },
  { type: 'date',        label: 'Ngày',        icon: Calendar },
  { type: 'textarea',    label: 'Textarea',    icon: AlignLeft },
  { type: 'select',      label: 'Dropdown',    icon: ChevronDown },
  { type: 'multiselect', label: 'Multi-select', icon: CheckSquare },
  { type: 'rating',      label: 'Rating',      icon: Star },
  { type: 'radio',       label: 'Yes/No',      icon: ToggleLeft },
]

export function FieldTypePanel() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const addField = useBuilderStore((s) => s.addField)
  const isDisabled = !selectedStepId

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-500 uppercase font-medium tracking-wide mb-3">
        Thêm câu hỏi
      </p>
      <div className="grid grid-cols-3 gap-2">
        {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={isDisabled}
            onClick={() => selectedStepId && addField(selectedStepId, type)}
            className="flex flex-col items-center gap-1.5 h-16 text-xs"
          >
            <Icon className="h-4 w-4 text-gray-500" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
