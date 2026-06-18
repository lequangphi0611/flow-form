export default function BuilderGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {children}
    </div>
  )
}
