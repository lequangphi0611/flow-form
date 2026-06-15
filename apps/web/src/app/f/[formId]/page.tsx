interface Props {
  params: Promise<{ formId: string }>
}

// SSR — public form page
export default async function PublicFormPage({ params }: Props) {
  const { formId } = await params

  // TODO: fetch form schema from API, render WizardRenderer
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-lg">
        <p className="text-gray-500 text-sm">Form: {formId}</p>
        {/* TODO: WizardRenderer component */}
      </div>
    </div>
  )
}
