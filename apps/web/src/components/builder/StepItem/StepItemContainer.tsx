'use client'

import { memo } from 'react'

import { useBuilderStore } from '@/store/builder.store'

import { StepItem } from './StepItem'

interface StepItemContainerProps {
  stepId: string
  index: number
}

export const StepItemContainer = memo(function StepItemContainer({
  stepId,
  index,
}: StepItemContainerProps) {
  const step = useBuilderStore((s) => s.form?.steps.find((st) => st.id === stepId))
  const selectStep = useBuilderStore((s) => s.selectStep)
  const removeStep = useBuilderStore((s) => s.removeStep)
  const updateStep = useBuilderStore((s) => s.updateStep)
  const isSelected = useBuilderStore((s) => s.selectedStepId === stepId)
  const isOnlyStep = useBuilderStore((s) => (s.form?.steps.length ?? 0) <= 1)

  if (!step) return null

  return (
    <StepItem
      step={step}
      index={index}
      isSelected={isSelected}
      isOnlyStep={isOnlyStep}
      onSelect={() => selectStep(stepId)}
      onRemove={() => removeStep(stepId)}
      onUpdateTitle={(title) => updateStep(stepId, { title })}
    />
  )
})
