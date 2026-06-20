import { Module } from '@nestjs/common'
import { ResponsesController } from './responses.controller'
import { ResponsesService } from './responses.service'
import { FormAccessGuard } from './guards/form-access.guard'
import { FormsModule } from '../forms/forms.module'
import { FormOwnerGuard } from '../forms/guards/form-owner.guard'

@Module({
  imports: [FormsModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, FormAccessGuard, FormOwnerGuard],
})
export class ResponsesModule {}
