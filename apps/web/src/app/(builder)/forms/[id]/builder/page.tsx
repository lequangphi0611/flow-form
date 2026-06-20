import { BuilderLayoutContainer } from '@/components/builder/BuilderLayout'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  return <BuilderLayoutContainer formId={id} />
}
