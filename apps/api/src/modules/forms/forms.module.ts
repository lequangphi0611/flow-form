import { Module } from '@nestjs/common'
import { FormsController } from './forms.controller'
import { FormsService } from './forms.service'
import { FormsRepository } from './forms.repository'
import { FormOwnerGuard } from './guards/form-owner.guard'

@Module({
  controllers: [FormsController],
  providers: [FormsService, FormsRepository, FormOwnerGuard],
  exports: [FormsRepository],
})
export class FormsModule {}
