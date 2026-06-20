import { useState, useRef } from 'react'

export function useInlineEdit(value: string, onUpdate: (v: string) => void) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setDraft(value)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function confirmEdit() {
    const trimmed = draft.trim()
    if (trimmed) {
      onUpdate(trimmed)
    } else {
      setDraft(value)
    }
    setIsEditing(false)
  }

  function cancelEdit() {
    setDraft(value)
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return { isEditing, draft, setDraft, inputRef, startEditing, confirmEdit, cancelEdit, handleKeyDown }
}
