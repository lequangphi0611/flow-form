import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { FormsRepository } from '../../forms/forms.repository'

@Injectable()
export class FormAccessGuard implements CanActivate {
  constructor(private readonly formsRepository: FormsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const formId = request.params['formId'] as string

    const form = await this.formsRepository.findStatusById(formId)

    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${formId}' does not exist.`,
      })
    }

    if (form.status !== 'published') {
      throw new ForbiddenException({
        type: 'https://flowform.dev/errors/form-not-published',
        title: 'Form Not Accepting Responses',
        status: 403,
        detail: 'This form is not published and cannot accept responses.',
      })
    }

    return true
  }
}
