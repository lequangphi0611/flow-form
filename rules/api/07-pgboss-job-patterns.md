# 07 - pg-boss Job Patterns

**Layer**: Backend
**Category**: Architecture, Reliability
**Severity**: Error
**Enforcement**: Manual Review, TypeScript
**Related Rules**: rules/api/04-service-layering.md, rules/api/02-dto-validation.md

## Rationale

FlowForm uses pg-boss as the sole job queue mechanism -- no Redis, no BullMQ, no setTimeout polling. All async operations (CSV export, analytics aggregation) go through pg-boss because it uses the existing PostgreSQL database and requires no additional infrastructure. Inconsistent patterns -- ad-hoc setTimeout, unvalidated job payloads, non-idempotent handlers -- lead to data corruption, missed jobs, and undebuggable failures.

## Rule Definition

1. All async/background work MUST go through pg-boss. Never use `setTimeout`, `setInterval`, or manual polling loops for deferred work.
2. Define job name as an exported `const` in the module file. Never use raw string literals in `send()` or `work()` calls.
3. Register job handlers in the module's `onModuleInit()` lifecycle hook.
4. Inject `PgBossService` (the wrapper around the pg-boss instance) into services via constructor DI.
5. Define a Zod schema for every job payload. Validate the payload at handler entry before any processing.
6. Handlers MUST be idempotent -- pg-boss retries failed jobs. Duplicate execution must produce the same outcome.
7. Never use BullMQ or any Redis-based queue.

## Correct Examples

```ts
// Good: define job name as exported const
// src/modules/jobs/jobs.constants.ts
export const EXPORT_CSV_JOB = 'export-csv'
export const AGGREGATE_ANALYTICS_JOB = 'aggregate-analytics'
```

```ts
// Good: Zod payload schema defined alongside the job constant
// src/modules/jobs/jobs.schemas.ts
import { z } from 'zod'

export const exportCsvPayloadSchema = z.object({
  formId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  requestedAt: z.string().datetime(),
})

export type ExportCsvPayload = z.infer<typeof exportCsvPayloadSchema>
```

```ts
// Good: PgBossService wrapper
// src/modules/jobs/pg-boss.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import PgBoss from 'pg-boss'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name)
  private boss: PgBoss

  constructor(private readonly config: ConfigService) {
    this.boss = new PgBoss(this.config.get('DATABASE_URL'))
  }

  async onModuleInit() {
    await this.boss.start()
    this.logger.log('pg-boss started')
  }

  async onModuleDestroy() {
    await this.boss.stop()
    this.logger.log('pg-boss stopped')
  }
  // ⚠️ onModuleDestroy CHỈ chạy nếu main.ts gọi app.enableShutdownHooks().
  // Thiếu nó → SIGTERM (Render restart/deploy) sẽ không stop pg-boss, không $disconnect
  // Prisma → rò connection. BẮT BUỘC có app.enableShutdownHooks() trước app.listen().

  async send<T extends object>(name: string, data: T): Promise<string | null> {
    return this.boss.send(name, data)
  }

  async work<T extends object>(
    name: string,
    handler: (job: PgBoss.Job<T>) => Promise<void>,
  ) {
    return this.boss.work<T>(name, handler)
  }
}
```

```ts
// Good: register handler in onModuleInit
// src/modules/jobs/jobs.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { PgBossService } from './pg-boss.service'
import { EXPORT_CSV_JOB } from './jobs.constants'
import { exportCsvPayloadSchema } from './jobs.schemas'
import type { ExportCsvPayload } from './jobs.schemas'
import { StorageService } from '../storage/storage.service'
import { FormsRepository } from '../forms/forms.repository'

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    private readonly boss: PgBossService,
    private readonly storage: StorageService,
    private readonly formsRepository: FormsRepository,
  ) {}

  async onModuleInit() {
    // Register all handlers here -- called once when module initializes
    await this.boss.work<ExportCsvPayload>(EXPORT_CSV_JOB, (job) =>
      this.handleExportCsv(job.data),
    )
    this.logger.log('Registered job handlers')
  }

  // === COMMAND: enqueue ===

  async enqueueExportCsv(formId: string, requestedBy: string) {
    const payload: ExportCsvPayload = {
      formId,
      requestedBy,
      requestedAt: new Date().toISOString(),
    }
    const jobId = await this.boss.send(EXPORT_CSV_JOB, payload)
    this.logger.log(`Enqueued ${EXPORT_CSV_JOB} job ${jobId} for form ${formId}`)
    return jobId
  }

  // === HANDLER (private -- called by pg-boss) ===

  private async handleExportCsv(rawData: unknown) {
    // Validate payload before any processing
    const payload = exportCsvPayloadSchema.parse(rawData)

    this.logger.log(`Processing ${EXPORT_CSV_JOB} for form ${payload.formId}`)

    // Idempotency: check if export already exists for this request
    const existingExport = await this.storage.findExportByRequestId(
      payload.formId,
      payload.requestedBy,
      payload.requestedAt,
    )
    if (existingExport) {
      this.logger.log('Export already exists, skipping duplicate job')
      return
    }

    const form = await this.formsRepository.findById(payload.formId)
    if (!form) {
      this.logger.warn(`Form ${payload.formId} not found during CSV export -- skipping`)
      return  // do not throw -- we don't want pg-boss to retry a missing form
    }

    // ... generate and upload CSV to R2 ...
  }
}
```

```ts
// Good: enqueue from another service
// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common'
import { JobsService } from '../jobs/jobs.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly jobsService: JobsService) {}

  async requestCsvExport(formId: string, requestedBy: string) {
    return this.jobsService.enqueueExportCsv(formId, requestedBy)
  }
}
```

## Incorrect Examples

```ts
// Bad: setTimeout for deferred work
@Injectable()
export class AnalyticsService {
  async requestCsvExport(formId: string) {
    setTimeout(async () => {
      // This is lost on server restart, not retried on failure,
      // not visible in any queue dashboard
      await this.generateAndUploadCsv(formId)
    }, 100)
  }
}
```

```ts
// Bad: using BullMQ (requires Redis, forbidden in FlowForm)
import { Queue } from 'bullmq'

const exportQueue = new Queue('export', {
  connection: { host: 'localhost', port: 6379 },  // Redis -- not in this project
})

await exportQueue.add('export-csv', { formId })
```

```ts
// Bad: raw string job name (typo-prone, not refactorable)
await this.boss.send('exprot-csv', { formId })  // typo: 'exprot' instead of 'export'
// The handler registered for 'export-csv' never receives this job
```

```ts
// Bad: no payload validation in handler
async function handleExportCsv(job: PgBoss.Job<unknown>) {
  // Assuming job.data has the right shape -- if pg-boss retries with a malformed
  // payload from an old schema, this crashes unpredictably
  const { formId, requestedBy } = job.data as any
  await generateCsv(formId)
}
```

```ts
// Bad: non-idempotent handler (duplicate execution corrupts data)
async handleExportCsv(data: ExportCsvPayload) {
  // If pg-boss retries this job (e.g., the worker crashed mid-export),
  // the CSV is generated twice and both records are saved
  await this.storage.saveExport(data.formId, await this.generateCsv(data.formId))
  // No check: does this export already exist?
}
```

```ts
// Bad: registering handlers in constructor instead of onModuleInit
@Injectable()
export class JobsService {
  constructor(private readonly boss: PgBossService) {
    // pg-boss may not be started yet when constructor runs
    this.boss.work(EXPORT_CSV_JOB, this.handleExportCsv)  // race condition
  }
}
```

## Exceptions

None. There are no approved alternatives to pg-boss for background job processing in this project. The constraint is architectural (no Redis, pg-boss uses existing PostgreSQL) and must not be bypassed.

## Cross-Layer Consistency Notes

- The frontend triggers CSV export via `POST /api/forms/:id/analytics/export` -- the controller enqueues a pg-boss job rather than processing synchronously. The frontend should show a "processing" state and poll for completion.
- The embed layer has no access to job queues.
- Rule 09 (Config & Env Patterns) governs how `DATABASE_URL` is read by `PgBossService` -- it must come from `ConfigService`, not `process.env` directly.
