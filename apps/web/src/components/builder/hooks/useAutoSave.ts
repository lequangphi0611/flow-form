'use client'

import { useEffect, useRef, useState } from 'react'

import type { FormSchema } from '@flowform/types'
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
  const pendingFormRef = useRef<FormSchema | null>(null)
  const formIdRef = useRef(formId)
  formIdRef.current = formId

  useEffect(() => {
    if (!form) return

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    pendingFormRef.current = form

    if (timerRef.current) clearTimeout(timerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await formsApi.updateSchema(formId, {
          title: form.title,
          schema: { steps: form.steps },
        })
        // Read path là server fetch (no-store) → quay lại trang sẽ tự lấy bản mới nhất,
        // không cần sync cache client. Store vẫn là source-of-truth khi đang edit.
        pendingFormRef.current = null
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

  useEffect(() => {
    function handleBeforeUnload() {
      const pending = pendingFormRef.current
      if (!pending) return
      formsApi.updateSchema(
        formIdRef.current,
        { title: pending.title, schema: { steps: pending.steps } },
        { keepalive: true },
      )
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return status
}
