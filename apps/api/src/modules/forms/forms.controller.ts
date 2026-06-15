import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common'
import { FormsService } from './forms.service'

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  findAll() {
    return this.formsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id)
  }

  @Post()
  create(@Body() body: unknown) {
    return this.formsService.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.formsService.update(id, body)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.formsService.publish(id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formsService.remove(id)
  }
}
