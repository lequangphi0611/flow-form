interface Props {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="h-screen flex">
      {/* Left: Step list */}
      <aside className="w-64 border-r bg-white p-4">
        <p className="text-sm text-gray-500">Các bước</p>
      </aside>

      {/* Center: Canvas */}
      <main className="flex-1 bg-gray-100 p-4">
        <p className="text-sm text-gray-500">Form ID: {id}</p>
      </main>

      {/* Right: Field settings */}
      <aside className="w-72 border-l bg-white p-4">
        <p className="text-sm text-gray-500">Cài đặt field</p>
      </aside>
    </div>
  )
}
