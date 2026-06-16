import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { AuthGuard } from '../../common/guards/auth.guard'
import { FormOwnerGuard } from '../forms/guards/form-owner.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { trackEventSchema } from './analytics.schema'
import type { TrackEventDto } from './analytics.schema'

@Controller('forms/:formId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Public — end-user tracking (no auth, called during form fill)
  @Post('events')
  track(
    @Param('formId') formId: string,
    @Body(new ZodValidationPipe(trackEventSchema)) dto: TrackEventDto,
  ) {
    return this.analyticsService.track(formId, dto)
  }

  // Form owner only — analytics data is sensitive
  @Get('funnel')
  @UseGuards(AuthGuard, FormOwnerGuard)
  getFunnel(@Param('formId') formId: string) {
    return this.analyticsService.getFunnel(formId)
  }

  @Get('summary')
  @UseGuards(AuthGuard, FormOwnerGuard)
  getSummary(@Param('formId') formId: string) {
    return this.analyticsService.getSummary(formId)
  }
}
