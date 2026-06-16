import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ResponsesService } from './responses.service'
import { FormAccessGuard } from './guards/form-access.guard'
import { AuthGuard } from '../../common/guards/auth.guard'

@Controller('forms/:formId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  // End-user submits a response — form must be published
  @Post()
  @UseGuards(FormAccessGuard)
  submit(@Param('formId') formId: string, @Body() body: unknown) {
    return this.responsesService.submit(formId, body)
  }

  // End-user saves draft — form must be published
  @Post('draft')
  @UseGuards(FormAccessGuard)
  saveDraft(@Param('formId') formId: string, @Body() body: unknown) {
    return this.responsesService.saveDraft(formId, body)
  }

  // Form owner views responses — auth required
  @Get()
  @UseGuards(AuthGuard)
  findAll(@Param('formId') formId: string, @Query() query: unknown) {
    return this.responsesService.findAll(formId, query)
  }
}
