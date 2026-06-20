import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getAuth } from './modules/auth/auth.config'
import { ValidationPipe } from '@nestjs/common'

const _esmImport = new Function('id', 'return import(id)') as (id: string) => Promise<any>

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })

  const auth = await getAuth()
  const { toNodeHandler } = (await _esmImport('better-auth/node')) as typeof import('better-auth/node')
  app.use('/api/auth/*splat', toNodeHandler(auth))

  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  await app.listen(process.env.PORT ?? 3001)
  console.log(`API running on http://localhost:${process.env.PORT ?? 3001}`)
}

bootstrap()
