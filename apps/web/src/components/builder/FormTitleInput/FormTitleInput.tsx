'use client'

import { useState, useRef } from 'react'

import { cn } from '@/lib/utils'
import { useInlineEdit } from '../hooks/useInlineEdit'

interface FormTitleInputProps {
  title: string
  onUpdateTitle: (title: string) => void
}

export function FormTitleInput({ title, onUpdateTitle }: FormTitleInputProps) {
  const {
    isEditing,
    draft: draftValue,
    setDraft: setDraftValue,
    inputRef,
    startEditing: startEditingBase,
    confirmEdit,
    cancelEdit,
  } = useInlineEdit(title, onUpdateTitle)

  const [errorMsg, setErrorMsg] = useState('')
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startEditing() {
    setErrorMsg('')
    startEditingBase()
  }

  function handleConfirm() {
    if (!draftValue.trim()) {
      setErrorMsg('Tiêu đề không được để trống')
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setErrorMsg(''), 2000)
    } else {
      setErrorMsg('')
    }
    confirmEdit()
  }

  function handleCancel() {
    setErrorMsg('')
    cancelEdit()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') handleCancel()
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
          onBlur={handleConfirm}
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
