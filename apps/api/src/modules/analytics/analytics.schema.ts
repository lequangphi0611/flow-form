import { z } from 'zod'

export const trackEventSchema = z.object({
  sessionId: z.string().uuid(),
  stepIndex: z.number().int().min(0),
  eventType: z.enum(['step_view', 'step_complete', 'form_abandon']),
})

export type TrackEventDto = z.infer<typeof trackEventSchema>
