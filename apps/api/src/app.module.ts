import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { FormsModule } from './modules/forms/forms.module'
import { ResponsesModule } from './modules/responses/responses.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { StorageModule } from './modules/storage/storage.module'
import { JobsModule } from './modules/jobs/jobs.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    FormsModule,
    ResponsesModule,
    AnalyticsModule,
    StorageModule,
    JobsModule,
  ],
})
export class AppModule {}
