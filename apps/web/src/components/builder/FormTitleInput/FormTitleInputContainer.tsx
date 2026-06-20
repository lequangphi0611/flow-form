'use client'

import { useBuilderStore } from '@/store/builder.store'

import { FormTitleInput } from './FormTitleInput'

export function FormTitleInputContainer() {
  const title = useBuilderStore((s) => s.form?.title ?? '')
  const updateTitle = useBuilderStore((s) => s.updateTitle)

  return <FormTitleInput title={title} onUpdateTitle={updateTitle} />
}
