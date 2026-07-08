import { requireSession } from '@/lib/auth-server'
import { getForms } from '@/lib/data/forms'

import { FormListContainer } from './FormListContainer'

// Async Server Component: fetch session + list trên server rồi seed client container.
// Tách riêng để page.tsx render shell ngay, phần này stream trong <Suspense> với skeleton.
export async function FormListSection() {
  const [session, initialForms] = await Promise.all([requireSession(), getForms()])
  return <FormListContainer userId={session.user.id} initialForms={initialForms} />
}
