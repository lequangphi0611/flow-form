'use client'

import { memo } from 'react'

import { useBuilderStore } from '@/store/builder.store'

import { FieldCard } from './FieldCard'

interface FieldCardContainerProps {
  stepId: string
  fieldId: string
  index: number
}

export const FieldCardContainer = memo(function FieldCardContainer({
  stepId,
  fieldId,
  index,
}: FieldCardContainerProps) {
  const field = useBuilderStore((s) =>
    s.form?.steps.find((st) => st.id === stepId)?.fields.find((f) => f.id === fieldId),
  )
  const selectField = useBuilderStore((s) => s.selectField)
  const removeField = useBuilderStore((s) => s.removeField)
  const isSelected = useBuilderStore((s) => s.selectedFieldId === fieldId)

  if (!field) return null

  return (
    <FieldCard
      stepId={stepId}
      field={field}
      index={index}
      isSelected={isSelected}
      onSelect={() => selectField(fieldId)}
      onDelete={(e) => {
        e.stopPropagation()
        removeField(stepId, fieldId)
      }}
    />
  )
})
