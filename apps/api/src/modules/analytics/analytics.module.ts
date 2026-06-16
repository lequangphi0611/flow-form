import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { FormsModule } from '../forms/forms.module'
import { FormOwnerGuard } from '../forms/guards/form-owner.guard'

@Module({
  imports: [FormsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, FormOwnerGuard],
})
export class AnalyticsModule {}
