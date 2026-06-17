import { Module } from '@nestjs/common'
import { ResponsesController } from './responses.controller'
import { ResponsesService } from './responses.service'
import { FormAccessGuard } from './guards/form-access.guard'
import { FormsModule } from '../forms/forms.module'

@Module({
  imports: [FormsModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, FormAccessGuard],
})
export class ResponsesModule {}
