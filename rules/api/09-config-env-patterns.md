# 09 - Config & Environment Variable Patterns

**Layer**: Backend
**Category**: Architecture, Security
**Severity**: Error
**Enforcement**: Manual Review, TypeScript (ConfigService type), startup validation (Zod throws on missing vars)
**Related Rules**: rules/api/04-service-layering.md, rules/api/08-storage-r2-patterns.md

## Rationale

Raw `process.env` access scattered throughout the codebase is unvalidated, untyped, and silently returns `undefined` when a variable is missing. This causes runtime crashes far from the root cause. Centralizing env access through a validated, typed `ConfigModule` setup means misconfigured deployments fail fast at startup with a clear error, not mysteriously at runtime during a user request.

## Rule Definition

1. All environment variable access in services, repositories, guards, and modules MUST go through `ConfigService` -- never `process.env.FOO` directly.
2. Exception: `main.ts` bootstrap code may read `process.env.PORT` before the NestJS context is initialized.
3. Define all env vars in a Zod validation schema at `src/config/env.schema.ts`. Export the inferred type as `EnvConfig`.
4. Pass the Zod validation function to `ConfigModule.forRoot({ validate })` in `app.module.ts`. The app must not start if required env vars are missing or invalid.
5. Use `ConfigService.getOrThrow<type>(key)` (not `.get()`) for required variables -- this throws if the value is undefined rather than silently returning undefined.
6. Inject `ConfigService` via constructor DI. Never import the env schema or `process.env` directly into a service file.

## Correct Examples

```ts
// Good: env schema with Zod validation
// src/config/env.schema.ts
import { z } from 'zod'

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Supabase Storage (Free tier)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),

  // Frontend URL (for CORS)
  FRONTEND_URL: z.string().url(),
})

export type EnvConfig = z.infer<typeof envSchema>

// validate function passed to ConfigModule
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const formatted = result.error.format()
    throw new Error(
      'Environment variable validation failed:\n' + JSON.stringify(formatted, null, 2),
    )
  }
  return result.data
}
```

```ts
// Good: ConfigModule setup in app.module.ts
// src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.schema'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,       // ConfigService available everywhere without re-importing
      validate: validateEnv, // Zod validation runs at startup
      cache: true,           // cache parsed values for performance
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

```ts
// Good: ConfigService injection in a service
// src/modules/storage/storage.service.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { EnvConfig } from '@/config/env.schema'

@Injectable()
export class StorageService {
  private readonly bucket: string

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    // getOrThrow: throws if R2_BUCKET_NAME is undefined (required var)
    this.bucket = this.config.getOrThrow('R2_BUCKET_NAME')
  }
}
```

```ts
// Good: main.ts is the one allowed exception for process.env
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Allowed: process.env.PORT in main.ts before NestJS context exists
  const port = process.env.PORT ?? 3001

  await app.listen(port)
  console.log(`API running on port ${port}`)
}

bootstrap()
```

```ts
// Good: accessing optional env var with fallback
// For an optional variable with a default defined in the schema
const nodeEnv = this.config.get<string>('NODE_ENV')  // 'development' | 'production' | 'test'
// Safe to use .get() because the schema already guarantees a default value
```

## Incorrect Examples

```ts
// Bad: raw process.env access in a service
@Injectable()
export class StorageService {
  private readonly bucket = process.env.R2_BUCKET_NAME  // string | undefined
  // If R2_BUCKET_NAME is missing, every upload silently uses 'undefined' as bucket name
}
```

```ts
// Bad: process.env access in a module factory
@Module({
  imports: [
    S3Module.register({
      endpoint: process.env.R2_ENDPOINT,  // unvalidated, untyped, undefined-prone
    }),
  ],
})
export class StorageModule {}
```

```ts
// Bad: .get() for required variable (returns undefined instead of throwing)
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  getAuthSecret() {
    const secret = this.config.get('BETTER_AUTH_SECRET')  // string | undefined
    // If the env var is missing, this returns undefined and auth silently breaks
    return secret
  }
}
```

```ts
// Bad: importing process.env indirectly via a config object
// src/config/constants.ts
export const config = {
  r2Endpoint: process.env.R2_ENDPOINT,  // evaluated at import time, no validation
  r2Bucket: process.env.R2_BUCKET_NAME,
}

// src/modules/storage/storage.service.ts
import { config } from '@/config/constants'  // bypasses ConfigService entirely
```

```ts
// Bad: ConfigModule without validation -- missing vars fail silently at runtime
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // No validate function -- missing R2_SECRET_ACCESS_KEY discovered only when
      // the first upload request fails in production
    }),
  ],
})
export class AppModule {}
```

## Exceptions

- `main.ts` bootstrap may use `process.env.PORT` before the NestJS application context is created.
- `auth.config.ts` may use `process.env` for Better Auth configuration if Better Auth initializes before `NestFactory.create()`. Document this with a comment. Prefer restructuring to use `ConfigService` if possible.

## Cross-Layer Consistency Notes

- The frontend (`apps/web`) uses Next.js env variables (`NEXT_PUBLIC_*` for client, plain vars for server). Different mechanism, same principle: validate at startup using Zod in `src/lib/env.ts`.
- The embed widget (`apps/embed`) does not read env vars -- the `apiUrl` is passed in at runtime by the host page.
- Rule 08 (Storage Supabase Patterns) depends on this rule: `StorageService` reads Supabase credentials via `ConfigService`.
- Rule 07 (pg-boss Job Patterns) depends on this rule: `PgBossService` reads `DATABASE_URL` via `ConfigService`.
