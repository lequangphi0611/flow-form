'use client'

import { useBuilderStore } from '@/store/builder.store'

import { FieldTypePanel } from './FieldTypePanel'

export function FieldTypePanelContainer() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const addField = useBuilderStore((s) => s.addField)

  return (
    <FieldTypePanel
      isDisabled={!selectedStepId}
      onAddField={(type) => selectedStepId && addField(selectedStepId, type)}
    />
  )
}
