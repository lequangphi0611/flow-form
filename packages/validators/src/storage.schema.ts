import { z } from 'zod'

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

export const uploadResponseSchema = z.object({
  publicUrl: z.string().url(),
  fileKey: z.string().min(1),
})

export type UploadResponse = z.infer<typeof uploadResponseSchema>
