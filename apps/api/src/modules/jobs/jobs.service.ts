import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import PgBoss from 'pg-boss'

export const JOB_EXPORT_CSV = 'export-csv'

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private boss!: PgBoss

  async onModuleInit() {
    this.boss = new PgBoss(process.env.DATABASE_URL!)
    await this.boss.start()

    // Register handlers
    await this.boss.work(JOB_EXPORT_CSV, async (job: any) => {
      console.log('Processing export-csv job', job.data)
      // TODO: query responses, build CSV, upload to R2
    })
  }

  async onModuleDestroy() {
    await this.boss.stop()
  }

  async enqueueExportCsv(formId: string) {
    await this.boss.send(JOB_EXPORT_CSV, { formId })
  }
}
