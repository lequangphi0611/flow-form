'use client'

import Link from 'next/link'
import { MoreHorizontal, Pencil, BarChart2, Trash2 } from 'lucide-react'

import type { FormSchema, FormStatus } from '@flowform/types'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const STATUS_LABEL: Record<FormStatus, string> = {
  published: 'Đã xuất bản',
  draft: 'Nháp',
  closed: 'Đã đóng',
}

const STATUS_VARIANT: Record<FormStatus, 'success' | 'secondary' | 'warning'> = {
  published: 'success',
  draft: 'secondary',
  closed: 'warning',
}

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' })

interface FormCardProps {
  form: FormSchema
  onDelete: (id: string) => void
}

export function FormCard({ form, onDelete }: FormCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-150">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/forms/${form.id}/builder`}
            className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors"
          >
            {form.title}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Tùy chọn" className="shrink-0 -mr-1">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Link → Next tự prefetch route khi menu mở; điều hướng tức thì */}
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}/builder`}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}/analytics`}>
                  <BarChart2 className="h-4 w-4" />
                  Xem responses
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => onDelete(form.id)}>
                <Trash2 className="h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge variant={STATUS_VARIANT[form.status]} className="w-fit">
          {STATUS_LABEL[form.status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-xs text-gray-500">
          {form.responseCount} phản hồi
        </p>
        <p className="text-xs text-gray-400">Tạo {DATE_FORMAT.format(new Date(form.createdAt))}</p>
      </CardContent>
    </Card>
  )
}
