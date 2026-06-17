import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { TrackEventDto } from './analytics.schema'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(formId: string, dto: TrackEventDto) {
    return this.prisma.formAnalyticsEvent.create({
      data: {
        formId,
        sessionId: dto.sessionId,
        stepIndex: dto.stepIndex,
        eventType: dto.eventType,
      },
    })
  }

  async getFunnel(formId: string) {
    const events = await this.prisma.formAnalyticsEvent.groupBy({
      by: ['stepIndex', 'eventType'],
      where: { formId },
      _count: { sessionId: true },
    })
    return events
  }

  async getSummary(formId: string) {
    const [totalResponses, completedResponses] = await Promise.all([
      this.prisma.formResponse.count({ where: { formId } }),
      this.prisma.formResponse.count({ where: { formId, completedAt: { not: null } } }),
    ])

    return {
      totalResponses,
      completedResponses,
      completionRate: totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0,
    }
  }
}
