export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'
  | 'rating'
  | 'signature'

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  message?: string
}

export interface Condition {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: string | number | boolean
}

export interface FieldSchema {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  options?: string[]       // for select / multiselect / radio
  validation?: FieldValidation
  conditions?: Condition[] // show this field only if conditions met
}

export interface StepSchema {
  id: string
  title: string
  description?: string
  fields: FieldSchema[]
  conditions?: Condition[] // skip this step if conditions not met
}

export interface ThemeConfig {
  primaryColor: string
  backgroundColor: string
  fontFamily: string
  logo?: string
  borderRadius: 'none' | 'sm' | 'md' | 'lg'
}

export interface FormSettings {
  submitButtonText: string
  successMessage: string
  redirectUrl?: string
  allowSaveDraft: boolean
  collectEmail: boolean
}

export interface FormSchema {
  id: string
  title: string
  description?: string
  steps: StepSchema[]
  theme: ThemeConfig
  settings: FormSettings
  published: boolean
  createdAt: string
  updatedAt: string
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  borderRadius: 'md',
}

export const DEFAULT_SETTINGS: FormSettings = {
  submitButtonText: 'Gửi',
  successMessage: 'Cảm ơn bạn đã điền form!',
  allowSaveDraft: true,
  collectEmail: false,
}
