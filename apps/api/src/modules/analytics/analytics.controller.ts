import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'

@Controller('forms/:formId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Track a user event (view/complete/abandon a step)
  @Post('events')
  track(@Param('formId') formId: string, @Body() body: unknown) {
    return this.analyticsService.track(formId, body)
  }

  // Funnel data — drop-off per step
  @Get('funnel')
  getFunnel(@Param('formId') formId: string) {
    return this.analyticsService.getFunnel(formId)
  }

  // Summary stats
  @Get('summary')
  getSummary(@Param('formId') formId: string) {
    return this.analyticsService.getSummary(formId)
  }
}
