import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ResponsesService } from './responses.service'
import { FormAccessGuard } from './guards/form-access.guard'
import { AuthGuard } from '../../common/guards/auth.guard'
import { FormOwnerGuard } from '../forms/guards/form-owner.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { submitResponseSchema, saveDraftResponseSchema } from '@flowform/validators'
import type { SubmitResponseDto, SaveDraftResponseDto } from '@flowform/validators'

@Controller('forms/:formId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  // End-user submits a response — form must be published
  @Post()
  @UseGuards(FormAccessGuard)
  submit(
    @Param('formId') formId: string,
    @Body(new ZodValidationPipe(submitResponseSchema)) dto: SubmitResponseDto,
  ) {
    return this.responsesService.submit(formId, dto)
  }

  // End-user saves draft — form must be published
  @Post('draft')
  @UseGuards(FormAccessGuard)
  saveDraft(
    @Param('formId') formId: string,
    @Body(new ZodValidationPipe(saveDraftResponseSchema)) dto: SaveDraftResponseDto,
  ) {
    return this.responsesService.saveDraft(formId, dto)
  }

  // Form owner views responses — auth + ownership required
  @Get()
  @UseGuards(AuthGuard, FormOwnerGuard)
  findAll(@Param('formId') formId: string) {
    return this.responsesService.findAll(formId)
  }
}
