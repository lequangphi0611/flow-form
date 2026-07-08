import { Module } from '@nestjs/common'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.schema'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { FormsModule } from './modules/forms/forms.module'
import { ResponsesModule } from './modules/responses/responses.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { StorageModule } from './modules/storage/storage.module'
import { JobsModule } from './modules/jobs/jobs.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    FormsModule,
    ResponsesModule,
    AnalyticsModule,
    StorageModule,
    JobsModule,
  ],
  providers: [
    // ThrottlerModule.forRoot chỉ cấu hình — phải đăng ký ThrottlerGuard làm global guard
    // thì rate-limit mới thực sự enforce.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Đăng ký filter qua DI token (thay vì app.useGlobalFilters(new ...)) để filter
    // inject được dependency và dễ test/mock.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
