import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function FormNotFound() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-center">
      <p className="text-lg font-medium text-gray-800">Form không tồn tại</p>
      <p className="text-sm text-gray-500">
        Form này đã bị xóa, chưa từng tồn tại, hoặc bạn không có quyền chỉnh sửa.
      </p>
      <Button asChild variant="outline">
        <Link href="/forms">Quay về danh sách form</Link>
      </Button>
    </div>
  )
}
