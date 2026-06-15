import { z } from 'zod'

export const conditionSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
})

export const fieldSchemaValidator = z.object({
  id: z.string(),
  type: z.enum([
    'text', 'textarea', 'number', 'email', 'phone',
    'select', 'multiselect', 'radio', 'checkbox',
    'date', 'file', 'rating', 'signature',
  ]),
  label: z.string().min(1, 'Label không được để trống'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: fieldValidationSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
})

export const stepSchemaValidator = z.object({
  id: z.string(),
  title: z.string().min(1, 'Tiêu đề bước không được để trống'),
  description: z.string().optional(),
  fields: z.array(fieldSchemaValidator),
  conditions: z.array(conditionSchema).optional(),
})

export const themeConfigSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  fontFamily: z.string(),
  logo: z.string().url().optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg']),
})

export const formSettingsSchema = z.object({
  submitButtonText: z.string().min(1),
  successMessage: z.string().min(1),
  redirectUrl: z.string().url().optional(),
  allowSaveDraft: z.boolean(),
  collectEmail: z.boolean(),
})

export const createFormSchema = z.object({
  title: z.string().min(1, 'Tiêu đề form không được để trống').max(100),
  description: z.string().max(500).optional(),
  steps: z.array(stepSchemaValidator).min(1, 'Form phải có ít nhất 1 bước'),
  theme: themeConfigSchema,
  settings: formSettingsSchema,
})

export type CreateFormInput = z.infer<typeof createFormSchema>
