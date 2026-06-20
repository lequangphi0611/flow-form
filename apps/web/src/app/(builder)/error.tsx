'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BuilderError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Builder]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-center">
      <p className="text-lg font-medium text-gray-800">Không tải được trình tạo form</p>
      <p className="text-sm text-gray-500 max-w-sm">
        Đã xảy ra lỗi. Vui lòng thử lại hoặc quay về danh sách form nếu vấn đề tiếp tục.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Thử lại
        </Button>
        <Button asChild variant="ghost">
          <Link href="/forms">Về danh sách form</Link>
        </Button>
      </div>
    </div>
  )
}
