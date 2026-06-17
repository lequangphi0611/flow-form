import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { FormsRepository } from './forms.repository'
import type { CreateFormDraftDto, UpdateFormDto } from '@flowform/validators'
import type { FormSchema } from '@flowform/types'

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name)

  constructor(private readonly formsRepository: FormsRepository) {}

  // === QUERY ===

  async listForms(userId: string): Promise<FormSchema[]> {
    return this.formsRepository.findByOwner(userId)
  }

  async getFormOrThrow(id: string): Promise<FormSchema> {
    const form = await this.formsRepository.findById(id)
    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${id}' does not exist.`,
      })
    }
    return form
  }

  async getPublishedFormOrThrow(id: string): Promise<FormSchema> {
    const form = await this.formsRepository.findPublishedById(id)
    if (!form) {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Form Not Found',
        status: 404,
        detail: `Form '${id}' does not exist or is not published.`,
      })
    }
    return form
  }

  // === COMMAND ===

  async createForm(userId: string, dto: CreateFormDraftDto): Promise<FormSchema> {
    this.logger.log(`Creating form for user ${userId}`)
    return this.formsRepository.create(userId, dto.title)
  }

  async updateForm(id: string, dto: UpdateFormDto): Promise<FormSchema> {
    // FormOwnerGuard has already verified existence and ownership
    return this.formsRepository.update(id, dto)
  }

  async publishForm(id: string): Promise<FormSchema> {
    // FormOwnerGuard has already verified existence and ownership
    const form = await this.getFormOrThrow(id)

    if (form.status !== 'draft') {
      throw new BadRequestException({
        type: 'https://flowform.dev/errors/invalid-transition',
        title: 'Invalid Status Transition',
        status: 400,
        detail: `Form must be in 'draft' status to publish. Current status: '${form.status}'.`,
      })
    }

    if (form.steps.length === 0) {
      throw new UnprocessableEntityException({
        type: 'https://flowform.dev/errors/empty-form',
        title: 'Form Cannot Be Published',
        status: 422,
        detail: 'Form must have at least one step before publishing.',
      })
    }

    return this.formsRepository.publish(id)
  }

  async deleteForm(id: string): Promise<void> {
    // FormOwnerGuard has already verified existence and ownership
    await this.formsRepository.delete(id)
    this.logger.log(`Form deleted: ${id}`)
  }
}
