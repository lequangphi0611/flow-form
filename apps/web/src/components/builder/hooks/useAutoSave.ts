'use client'

import { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '@/store/builder.store'
import { formsApi } from '@/lib/api/forms'

export type SaveStatusValue = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY = 800
const SAVED_DISPLAY_DURATION = 3000

export function useAutoSave(formId: string): SaveStatusValue {
  const form = useBuilderStore((s) => s.form)
  const [status, setStatus] = useState<SaveStatusValue>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (!form) return

    // Skip the initial setForm() hydration call — only auto-save user changes
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await formsApi.updateSchema(formId, {
          title: form.title,
          schema: { steps: form.steps },
        })
        setStatus('saved')
        savedTimerRef.current = setTimeout(() => setStatus('idle'), SAVED_DISPLAY_DURATION)
      } catch {
        setStatus('error')
      }
    }, AUTOSAVE_DELAY)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [form, formId])

  return status
}
