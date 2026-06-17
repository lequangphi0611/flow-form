'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { formKeys } from '@/lib/query-keys'
import { useFormList } from '@/hooks/forms/useFormList'
import { useDeleteForm } from '@/hooks/forms/useDeleteForm'
import { FormGrid } from '../FormGrid'
import { FormGridSkeleton } from '../FormGridSkeleton'
import { DeleteFormDialog } from '../DeleteFormDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { CreateFormButton } from '../CreateFormButton'

export function FormListContainer() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null)

  const { data: forms = [], isLoading, isError } = useFormList()

  const { mutate: deleteForm, isPending: isDeleting } = useDeleteForm({
    onSuccess: () => setDeletingFormId(null),
  })

  const deletingForm = forms.find((f) => f.id === deletingFormId)

  if (isLoading) return <FormGridSkeleton />

  if (isError) {
    return (
      <EmptyState
        title="Không thể tải danh sách form"
        description="Đã có lỗi xảy ra. Vui lòng thử lại."
        action={
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => queryClient.invalidateQueries({ queryKey: formKeys.all })}
          >
            Thử lại
          </button>
        }
      />
    )
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        title="Chưa có form nào"
        description="Tạo form đầu tiên để bắt đầu thu thập dữ liệu."
        action={<CreateFormButton />}
      />
    )
  }

  return (
    <>
      <FormGrid
        forms={forms}
        onDelete={(id) => setDeletingFormId(id)}
        onEdit={(id) => router.push(`/forms/${id}/builder`)}
        onViewResponses={(id) => router.push(`/forms/${id}/analytics`)}
      />
      {deletingForm && (
        <DeleteFormDialog
          formTitle={deletingForm.title}
          isOpen={!!deletingFormId}
          isPending={isDeleting}
          onConfirm={() => deleteForm(deletingFormId!)}
          onCancel={() => setDeletingFormId(null)}
        />
      )}
    </>
  )
}
