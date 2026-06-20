'use client'

import type { StepSchema } from '@flowform/types'

import { useBuilderStore } from '@/store/builder.store'

import { StepList } from './StepList'

const EMPTY_STEPS: StepSchema[] = []

export function StepListContainer() {
  const steps = useBuilderStore((s) => s.form?.steps ?? EMPTY_STEPS)
  const addStep = useBuilderStore((s) => s.addStep)
  const stepIds = steps.map((s) => s.id)

  return <StepList stepIds={stepIds} onAddStep={addStep} />
}
