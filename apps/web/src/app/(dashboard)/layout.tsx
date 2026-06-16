import { SignOutButton } from '@/components/auth/SignOutButton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 border-b bg-white flex items-center justify-between px-6">
        <span className="font-semibold text-gray-900">FlowForm</span>
        <SignOutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
