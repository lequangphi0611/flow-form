import type { FormSchema } from '@flowform/types'
import { FormCard } from './FormCard'

interface FormGridProps {
  forms: FormSchema[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onViewResponses: (id: string) => void
}

export function FormGrid({ forms, onDelete, onEdit, onViewResponses }: FormGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form) => (
        <FormCard
          key={form.id}
          form={form}
          onDelete={onDelete}
          onEdit={onEdit}
          onViewResponses={onViewResponses}
        />
      ))}
    </div>
  )
}
