import { Suspense } from 'react'

import { CreateFormButton } from '@/components/forms/CreateFormButton'
import { FormListSection } from '@/components/forms/FormList'
import { FormListSkeleton } from '@/components/forms/FormListSkeleton'

export default function FormsPage() {
  // Shell tĩnh render ngay; phần list fetch trên server và stream trong Suspense,
  // hiện skeleton thay vì block cả trang (đặc biệt quan trọng với cold start của API).
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi các form của bạn</p>
        </div>
        <CreateFormButton />
      </div>
      <Suspense fallback={<FormListSkeleton />}>
        <FormListSection />
      </Suspense>
    </div>
  )
}
