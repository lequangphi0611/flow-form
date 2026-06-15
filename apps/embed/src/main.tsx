import { render } from 'preact'
import { App } from './App'

function mountAll() {
  const elements = document.querySelectorAll<HTMLElement>('[data-flowform]')
  elements.forEach((el) => {
    const formId = el.dataset.flowformId
    if (!formId) return
    render(<App formId={formId} apiUrl={el.dataset.flowformApi ?? ''} />, el)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll)
} else {
  mountAll()
}

// Programmatic API: FlowForm.init({ formId, target })
declare global {
  interface Window {
    FlowForm: {
      init: (config: { formId: string; target: string | HTMLElement; apiUrl?: string }) => void
    }
  }
}

window.FlowForm = {
  init({ formId, target, apiUrl = '' }) {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
    if (!el) return
    render(<App formId={formId} apiUrl={apiUrl} />, el)
  },
}
