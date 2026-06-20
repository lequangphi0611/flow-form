import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { FormSchema, StepSchema, FieldSchema } from '@flowform/types'

const DEFAULT_STEP_TITLE = 'Bước mới'
const DEFAULT_FIELD_LABEL = 'Câu hỏi mới'

interface BuilderState {
  form: FormSchema | null
  selectedStepId: string | null
  selectedFieldId: string | null
}

interface BuilderActions {
  setForm: (form: FormSchema) => void
  selectStep: (stepId: string | null) => void
  selectField: (fieldId: string | null) => void
  updateTitle: (title: string) => void
  addStep: () => void
  removeStep: (stepId: string) => void
  updateStep: (stepId: string, updates: Partial<Pick<StepSchema, 'title' | 'description'>>) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  addField: (stepId: string, type: FieldSchema['type']) => void
  removeField: (stepId: string, fieldId: string) => void
  updateField: (stepId: string, fieldId: string, updates: Partial<FieldSchema>) => void
  reorderFields: (stepId: string, fromIndex: number, toIndex: number) => void
}

export const useBuilderStore = create<BuilderState & BuilderActions>()(
  immer((set) => ({
    form: null,
    selectedStepId: null,
    selectedFieldId: null,

    setForm: (form) =>
      set((s) => {
        s.form = form
        s.selectedStepId = form.steps[0]?.id ?? null
        s.selectedFieldId = null
      }),

    updateTitle: (title) =>
      set((s) => {
        if (!s.form) return
        s.form.title = title
      }),

    selectStep: (stepId) =>
      set((s) => {
        s.selectedStepId = stepId
        s.selectedFieldId = null
      }),

    selectField: (fieldId) =>
      set((s) => {
        s.selectedFieldId = fieldId
      }),

    addStep: () =>
      set((s) => {
        if (!s.form) return
        s.form.steps.push({
          id: crypto.randomUUID(),
          title: DEFAULT_STEP_TITLE,
          fields: [],
        })
      }),

    removeStep: (stepId) =>
      set((s) => {
        if (!s.form) return
        s.form.steps = s.form.steps.filter((step) => step.id !== stepId)
      }),

    updateStep: (stepId, updates) =>
      set((s) => {
        if (!s.form) return
        const step = s.form.steps.find((st) => st.id === stepId)
        if (step) Object.assign(step, updates)
      }),

    reorderSteps: (fromIndex, toIndex) =>
      set((s) => {
        if (!s.form) return
        const [moved] = s.form.steps.splice(fromIndex, 1)
        s.form.steps.splice(toIndex, 0, moved)
      }),

    addField: (stepId, type) =>
      set((s) => {
        if (!s.form) return
        const step = s.form.steps.find((st) => st.id === stepId)
        step?.fields.push({
          id: crypto.randomUUID(),
          type,
          label: DEFAULT_FIELD_LABEL,
          required: false,
        })
      }),

    removeField: (stepId, fieldId) =>
      set((s) => {
        if (!s.form) return
        const step = s.form.steps.find((st) => st.id === stepId)
        if (step) step.fields = step.fields.filter((f) => f.id !== fieldId)
      }),

    updateField: (stepId, fieldId, updates) =>
      set((s) => {
        if (!s.form) return
        const step = s.form.steps.find((st) => st.id === stepId)
        const field = step?.fields.find((f) => f.id === fieldId)
        if (field) Object.assign(field, updates)
      }),

    reorderFields: (stepId, fromIndex, toIndex) =>
      set((s) => {
        if (!s.form) return
        const step = s.form.steps.find((st) => st.id === stepId)
        if (!step) return
        const [moved] = step.fields.splice(fromIndex, 1)
        step.fields.splice(toIndex, 0, moved)
      }),
  }))
)
