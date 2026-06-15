import { useState, useEffect } from 'preact/hooks'
import type { FormSchema } from '@flowform/types'

interface Props {
  formId: string
  apiUrl: string
}

export function App({ formId, apiUrl }: Props) {
  const [form, setForm] = useState<FormSchema | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${apiUrl}/api/forms/${formId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Không thể tải form')
        setLoading(false)
      })
  }, [formId, apiUrl])

  if (loading) return <div class="flowform-loading">Đang tải...</div>
  if (error) return <div class="flowform-error">{error}</div>
  if (!form) return null

  const step = form.steps[currentStep]
  const isLast = currentStep === form.steps.length - 1

  return (
    <div class="flowform-embed">
      {/* Progress bar */}
      <div class="flowform-progress">
        <div
          class="flowform-progress-bar"
          style={{ width: `${((currentStep + 1) / form.steps.length) * 100}%` }}
        />
      </div>

      <h2>{step.title}</h2>

      {/* TODO: render fields from step.fields */}

      <div class="flowform-nav">
        {currentStep > 0 && (
          <button onClick={() => setCurrentStep((s) => s - 1)}>Trước</button>
        )}
        {!isLast ? (
          <button onClick={() => setCurrentStep((s) => s + 1)}>Tiếp theo</button>
        ) : (
          <button type="submit">Gửi</button>
        )}
      </div>
    </div>
  )
}
