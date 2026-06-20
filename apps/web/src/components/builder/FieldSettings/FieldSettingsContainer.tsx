'use client'

import type { FieldSchema } from '@flowform/types'

import { useBuilderStore } from '@/store/builder.store'

import { FieldSettings } from './FieldSettings'

export function FieldSettingsContainer() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const selectedFieldId = useBuilderStore((s) => s.selectedFieldId)
  const field = useBuilderStore((s) => {
    if (!s.selectedStepId || !s.selectedFieldId) return null
    return (
      s.form?.steps
        .find((st) => st.id === s.selectedStepId)
        ?.fields.find((f) => f.id === s.selectedFieldId) ?? null
    )
  })
  const updateField = useBuilderStore((s) => s.updateField)

  function onUpdateField(updates: Partial<FieldSchema>) {
    if (!selectedStepId || !selectedFieldId) return
    updateField(selectedStepId, selectedFieldId, updates)
  }

  return <FieldSettings field={field} onUpdateField={onUpdateField} />
}
