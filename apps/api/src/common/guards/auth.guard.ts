import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { auth } from '../../modules/auth/auth.config'
import type { SessionUser } from '../types/session.types'

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    const session = await auth.api.getSession({
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : (v ?? ''),
        ])
      ),
    })

    if (!session?.user) {
      throw new UnauthorizedException({
        type: 'https://flowform.dev/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        detail: 'You must be signed in to access this resource.',
      })
    }

    ;(request as Request & { user: SessionUser }).user = session.user as SessionUser

    return true
  }
}
