import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { FormSchema } from '@flowform/types'

const API_URL = process.env.API_URL ?? ''

// Builder đọc form qua endpoint /editor (auth + ownership) — trả cả draft,
// khác với GET /:id public (chỉ trả form đã publish).
// React.cache() dedup giữa page và generateMetadata trong cùng 1 request.
// no-store: builder đang edit nên luôn lấy bản mới nhất.
// 404 (không tồn tại) và 403 (không phải owner) đều → notFound() để không lộ sự tồn tại.
export const getFormForEditor = cache(async (id: string): Promise<FormSchema> => {
  const headersList = await headers()

  const res = await fetch(`${API_URL}/api/forms/${id}/editor`, {
    headers: { cookie: headersList.get('cookie') ?? '' },
    cache: 'no-store',
  })

  if (res.status === 404 || res.status === 403) notFound()
  if (!res.ok) throw new Error(`getFormForEditor failed: ${res.status}`)
  return res.json()
})

// Danh sách form của user — server fetch lần đầu cho dashboard (hybrid).
// no-store: user thêm/xóa form liên tục nên cần fresh. Kết quả truyền xuống làm
// initialData cho TanStack Query; client lo invalidate sau create/delete.
export async function getForms(): Promise<FormSchema[]> {
  const headersList = await headers()

  const res = await fetch(`${API_URL}/api/forms`, {
    headers: { cookie: headersList.get('cookie') ?? '' },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`getForms failed: ${res.status}`)
  return res.json()
}
