'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useBuilderStore } from '@/store/builder.store'

export function FormTitleInput() {
  const title = useBuilderStore((s) => s.form?.title ?? '')
  const updateTitle = useBuilderStore((s) => s.updateTitle)

  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startEditing() {
    setDraftValue(title)
    setErrorMsg('')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function confirmEdit() {
    const trimmed = draftValue.trim()
    if (!trimmed) {
      setDraftValue(title)
      setIsEditing(false)
      setErrorMsg('Tiêu đề không được để trống')
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setErrorMsg(''), 2000)
      return
    }
    updateTitle(trimmed)
    setIsEditing(false)
    setErrorMsg('')
  }

  function cancelEdit() {
    setIsEditing(false)
    setErrorMsg('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="relative">
      {isEditing ? (
        <input
          ref={inputRef}
          value={draftValue}
          onChange={(e) => {
            setDraftValue(e.target.value)
            if (errorMsg) setErrorMsg('')
          }}
          onBlur={confirmEdit}
          onKeyDown={handleKeyDown}
          className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none w-64"
        />
      ) : (
        <span
          onClick={startEditing}
          title="Nhấn để đổi tên"
          className={cn(
            'text-lg font-semibold text-gray-900 truncate max-w-xs block cursor-pointer',
            'border-b border-dashed border-transparent hover:border-gray-400 transition-colors duration-150',
          )}
        >
          {title}
        </span>
      )}
      {errorMsg && (
        <p className="absolute top-full left-0 mt-0.5 text-xs text-red-500 whitespace-nowrap">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
