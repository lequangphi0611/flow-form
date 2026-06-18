'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBuilderStore } from '@/store/builder.store'
import { FieldCard } from './FieldCard'
import { FieldTypePanel } from './FieldTypePanel'
import type { FieldSchema } from '@flowform/types'

const EMPTY_FIELDS: FieldSchema[] = []

export function FieldCanvas() {
  const selectedStepId = useBuilderStore((s) => s.selectedStepId)
  const selectedStep = useBuilderStore((s) =>
    s.form?.steps.find((st) => st.id === s.selectedStepId) ?? null,
  )
  const fields = selectedStep?.fields ?? EMPTY_FIELDS
  const fieldIds = fields.map((f) => f.id)

  if (!selectedStepId || !selectedStep) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">Chọn một bước để bắt đầu</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{selectedStep.title}</h2>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Chưa có câu hỏi nào. Thêm từ danh sách bên dưới.
            </p>
          ) : (
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <FieldCard
                    key={field.id}
                    stepId={selectedStepId}
                    field={field}
                    index={index}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </div>

        <FieldTypePanel />
      </div>
    </div>
  )
}
