import type { FormSchema } from '@flowform/types'

import { FormCard } from '../FormCard'

interface FormListProps {
  forms: FormSchema[]
  onDelete: (id: string) => void
}

export function FormList({ forms, onDelete }: FormListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form) => (
        <FormCard key={form.id} form={form} onDelete={onDelete} />
      ))}
    </div>
  )
}
