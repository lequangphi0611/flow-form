import { Module } from '@nestjs/common'

// Better Auth is mounted as raw middleware in main.ts (/api/auth/*)
// This module exists for future guards / decorators (e.g. @CurrentUser)
@Module({})
export class AuthModule {}
