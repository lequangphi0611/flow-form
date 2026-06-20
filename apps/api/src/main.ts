import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getAuth } from './modules/auth/auth.config'
import { ValidationPipe } from '@nestjs/common'

const _esmImport = new Function('id', 'return import(id)') as (id: string) => Promise<any>

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Render chạy sau reverse proxy — trust proxy để ThrottlerGuard lấy đúng client IP
  // (X-Forwarded-For), nếu không mọi request chung 1 IP proxy → rate-limit sai.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })

  const auth = await getAuth()
  const { toNodeHandler } = (await _esmImport('better-auth/node')) as typeof import('better-auth/node')
  app.use('/api/auth/*splat', toNodeHandler(auth))

  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  // ThrottlerGuard + HttpExceptionFilter đăng ký global qua APP_GUARD/APP_FILTER (app.module)

  // Cho onModuleDestroy (pg-boss stop, Prisma $disconnect) chạy khi nhận SIGTERM/SIGINT
  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3001)
  console.log(`API running on http://localhost:${process.env.PORT ?? 3001}`)
}

bootstrap()
