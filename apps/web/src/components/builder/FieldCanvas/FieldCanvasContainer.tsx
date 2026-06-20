'use client'

import type { FieldSchema } from '@flowform/types'

import { useBuilderStore } from '@/store/builder.store'

import { FieldCanvas } from './FieldCanvas'

const EMPTY_FIELDS: FieldSchema[] = []

export function FieldCanvasContainer() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const selectedStep = useBuilderStore((s) =>
    s.form?.steps.find((st) => st.id === s.selectedStepId) ?? null,
  )
  const fields = selectedStep?.fields ?? EMPTY_FIELDS
  const fieldIds = fields.map((f) => f.id)

  return (
    <FieldCanvas
      selectedStepId={selectedStepId}
      stepTitle={selectedStep?.title ?? ''}
      fieldIds={fieldIds}
    />
  )
}
