import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { FormsRepository } from './forms.repository'
import type { CreateFormDraftDto } from '@flowform/validators'
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

  // === COMMAND ===

  async createForm(userId: string, dto: CreateFormDraftDto): Promise<FormSchema> {
    this.logger.log(`Creating form for user ${userId}`)
    return this.formsRepository.create(userId, dto.title)
  }

  async deleteForm(id: string): Promise<void> {
    await this.getFormOrThrow(id)
    await this.formsRepository.delete(id)
    this.logger.log(`Form deleted: ${id}`)
  }
}
