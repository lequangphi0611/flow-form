import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { FormsService } from './forms.service'
import { AuthGuard } from '../../common/guards/auth.guard'
import { FormOwnerGuard } from './guards/form-owner.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { createFormDraftSchema } from '@flowform/validators'
import type { CreateFormDraftDto } from '@flowform/validators'
import type { SessionUser } from '../../common/types/session.types'

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // === PUBLIC (published forms only) ===

  @Get(':id')
  getPublicForm(@Param('id') id: string) {
    return this.formsService.getPublishedFormOrThrow(id)
  }

  // === AUTH REQUIRED ===

  @Get()
  @UseGuards(AuthGuard)
  listForms(@CurrentUser() user: SessionUser) {
    return this.formsService.listForms(user.id)
  }

  @Post()
  @UseGuards(AuthGuard)
  createForm(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createFormDraftSchema)) dto: CreateFormDraftDto,
  ) {
    return this.formsService.createForm(user.id, dto)
  }

  // === OWNERSHIP REQUIRED ===

  @Delete(':id')
  @UseGuards(AuthGuard, FormOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForm(@Param('id') id: string) {
    await this.formsService.deleteForm(id)
  }
}
