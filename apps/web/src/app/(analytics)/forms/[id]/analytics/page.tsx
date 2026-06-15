interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics — Form {id}</h1>
      {/* TODO: Funnel chart + response table */}
    </div>
  )
}
