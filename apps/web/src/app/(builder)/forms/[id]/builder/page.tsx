import { BuilderContainer } from '@/components/builder/containers/BuilderContainer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: Props) {
  const { id } = await params
  return <BuilderContainer formId={id} />
}
