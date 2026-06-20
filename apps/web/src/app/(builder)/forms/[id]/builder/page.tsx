import type { Metadata } from 'next'

import { requireSession } from '@/lib/auth-server'
import { getFormForEditor } from '@/lib/data/forms'
import { BuilderLayoutContainer } from '@/components/builder/BuilderLayout'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  // React.cache() → dùng chung kết quả với page bên dưới, không gọi API thêm lần nào
  const form = await getFormForEditor(id).catch(() => null)
  return { title: form ? `Builder — ${form.title}` : 'Builder' }
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  await requireSession() // builder là route cần đăng nhập

  const initialForm = await getFormForEditor(id) // 404/403 → notFound() tự động

  return <BuilderLayoutContainer initialForm={initialForm} />
}
