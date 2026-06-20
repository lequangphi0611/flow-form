import { Module, Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import type { EnvConfig } from '../../config/env.schema'
import { StorageService } from './storage.service'
import { StorageController } from './storage.controller'
import { SUPABASE_CLIENT } from './storage.constants'

const supabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>) =>
    createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
      { realtime: { transport: ws as any } },
    ),
}

@Module({
  controllers: [StorageController],
  providers: [supabaseProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
