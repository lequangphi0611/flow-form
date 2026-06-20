import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  // Chạy khi app shutdown — cần app.enableShutdownHooks() trong main.ts.
  // Đóng connection sạch để không rò pool (quan trọng với giới hạn connection của Neon).
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
