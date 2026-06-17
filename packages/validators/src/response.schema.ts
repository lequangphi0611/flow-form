import { z } from 'zod'

// Schema cho POST /api/forms/:id/responses — end-user submit
export const submitResponseSchema = z.object({
  sessionId: z.string().uuid().optional(),
  data: z.record(z.string(), z.unknown()),
})

export type SubmitResponseDto = z.infer<typeof submitResponseSchema>

// Schema cho POST /api/forms/:id/responses/draft — end-user save draft
export const saveDraftResponseSchema = z.object({
  sessionId: z.string().uuid().optional(),
  responseId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
})

export type SaveDraftResponseDto = z.infer<typeof saveDraftResponseSchema>
