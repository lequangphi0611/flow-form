import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '../../../prisma/prisma.service'

@Injectable()
export class FormOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const formId = request.params['id']
    const userId = request.user?.id

    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: { ownerId: true },
    })

    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${formId}' does not exist.`,
      })
    }

    if (form.ownerId !== userId) {
      throw new ForbiddenException({
        type: 'https://flowform.dev/errors/forbidden',
        title: 'Access Denied',
        status: 403,
        detail: 'You do not have permission to modify this form.',
      })
    }

    return true
  }
}
