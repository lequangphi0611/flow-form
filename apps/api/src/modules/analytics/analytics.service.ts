import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(formId: string, data: unknown) {
    return this.prisma.formAnalyticsEvent.create({
      data: {
        formId,
        sessionId: (data as any).sessionId,
        stepIndex: (data as any).stepIndex,
        eventType: (data as any).eventType,
      },
    })
  }

  async getFunnel(formId: string) {
    // Group by stepIndex and eventType to calculate drop-off
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
