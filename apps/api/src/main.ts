import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { auth } from './modules/auth/auth.config'
import { toNodeHandler } from 'better-auth/node'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Better Auth handles all /api/auth/* routes before NestJS middleware
  app.use('/api/auth/*', toNodeHandler(auth))

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  await app.listen(process.env.PORT ?? 3001)
  console.log(`API running on http://localhost:${process.env.PORT ?? 3001}`)
}

bootstrap()
