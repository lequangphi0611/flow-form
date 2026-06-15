export interface FormResponse {
  id: string
  formId: string
  sessionId: string
  data: Record<string, unknown> // { [fieldId]: value }
  completedAt: string | null
  createdAt: string
}

export type AnalyticsEventType = 'view' | 'complete' | 'abandon'

export interface AnalyticsEvent {
  id: string
  formId: string
  sessionId: string
  stepIndex: number
  eventType: AnalyticsEventType
  createdAt: string
}

export interface FunnelStep {
  stepIndex: number
  title: string
  views: number
  completions: number
  dropOffRate: number // 0–100
}

export interface FormSummary {
  totalResponses: number
  completedResponses: number
  completionRate: number // 0–100
}
