import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import type { EnvConfig } from '../../config/env.schema'
import { StorageService } from './storage.service'
import { StorageController } from './storage.controller'

export const FIREBASE_APP = 'FIREBASE_APP'

const firebaseProvider = {
  provide: FIREBASE_APP,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvConfig, true>): App => {
    if (getApps().length > 0) return getApps()[0]
    return initializeApp({
      credential: cert({
        projectId: config.getOrThrow('FIREBASE_PROJECT_ID'),
        clientEmail: config.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        privateKey: config.getOrThrow('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
      storageBucket: config.getOrThrow('FIREBASE_STORAGE_BUCKET'),
    })
  },
}

@Module({
  controllers: [StorageController],
  providers: [firebaseProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
