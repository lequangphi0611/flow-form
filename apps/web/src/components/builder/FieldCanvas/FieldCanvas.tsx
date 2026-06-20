'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { FieldCardContainer } from '../FieldCard'
import { FieldTypePanelContainer } from '../FieldTypePanel'

interface FieldCanvasProps {
  selectedStepId: string | null
  stepTitle: string
  fieldIds: string[]
}

export function FieldCanvas({ selectedStepId, stepTitle, fieldIds }: FieldCanvasProps) {
  if (!selectedStepId) {
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
          <h2 className="text-base font-semibold text-gray-900 mb-4">{stepTitle}</h2>

          {fieldIds.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Chưa có câu hỏi nào. Thêm từ danh sách bên dưới.
            </p>
          ) : (
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {fieldIds.map((fieldId, index) => (
                  <FieldCardContainer
                    key={fieldId}
                    stepId={selectedStepId}
                    fieldId={fieldId}
                    index={index}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </div>

        <FieldTypePanelContainer />
      </div>
    </div>
  )
}
