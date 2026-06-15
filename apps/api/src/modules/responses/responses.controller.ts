import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { ResponsesService } from './responses.service'

@Controller('forms/:formId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  // End-user submits a response
  @Post()
  submit(@Param('formId') formId: string, @Body() body: unknown) {
    return this.responsesService.submit(formId, body)
  }

  // End-user saves draft
  @Post('draft')
  saveDraft(@Param('formId') formId: string, @Body() body: unknown) {
    return this.responsesService.saveDraft(formId, body)
  }

  // Form owner views responses
  @Get()
  findAll(@Param('formId') formId: string, @Query() query: unknown) {
    return this.responsesService.findAll(formId, query)
  }
}
