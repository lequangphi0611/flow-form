'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FormSchema } from '@flowform/types'
import { formKeys } from '@/lib/query-keys'
import { useFormList } from '@/hooks/forms/useFormList'
import { useDeleteForm } from '@/hooks/forms/useDeleteForm'
import { EmptyState } from '@/components/common/EmptyState'

import { FormList } from './FormList'
import { DeleteFormDialog } from '../DeleteFormDialog'
import { CreateFormButton } from '../CreateFormButton'

interface FormListContainerProps {
  userId: string
  initialForms: FormSchema[]
}

export function FormListContainer({ userId, initialForms }: FormListContainerProps) {
  const queryClient = useQueryClient()
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null)

  // initialData từ server → không có trạng thái loading ở client; skeleton do
  // <Suspense> ở page lo. Chỉ còn xử lý error (refetch nền lỗi) và empty.
  const { data: forms = [], isError } = useFormList(userId, initialForms)

  const { mutate: deleteForm, isPending: isDeleting } = useDeleteForm({
    onSuccess: () => {
      setDeletingFormId(null)
      toast.success('Đã xóa form thành công')
    },
    onError: (error) => {
      setDeletingFormId(null)
      toast.error('Xóa form thất bại', {
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    },
  })

  const deletingForm = forms.find((f) => f.id === deletingFormId)

  if (isError) {
    return (
      <EmptyState
        title="Không thể tải danh sách form"
        description="Đã có lỗi xảy ra. Vui lòng thử lại."
        action={
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => queryClient.invalidateQueries({ queryKey: formKeys.root })}
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
      <FormList forms={forms} onDelete={(id) => setDeletingFormId(id)} />
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
