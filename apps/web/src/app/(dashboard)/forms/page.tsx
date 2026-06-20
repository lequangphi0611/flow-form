import { requireSession } from '@/lib/auth-server'
import { getForms } from '@/lib/data/forms'
import { CreateFormButton } from '@/components/forms/CreateFormButton'
import { FormListContainer } from '@/components/forms/FormList'

export default async function FormsPage() {
  // Server-first: đọc session + list ngay trên server, tránh waterfall session→list ở client.
  const session = await requireSession()
  const initialForms = await getForms()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi các form của bạn</p>
        </div>
        <CreateFormButton />
      </div>
      <FormListContainer userId={session.user.id} initialForms={initialForms} />
    </div>
  )
}
