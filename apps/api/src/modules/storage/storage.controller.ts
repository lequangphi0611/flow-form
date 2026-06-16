import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { StorageService } from './storage.service'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

// TODO: add @UseGuards(AuthGuard) and @CurrentUser() once auth guard is implemented
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new UnsupportedMediaTypeException(`MIME type '${file.mimetype}' is not allowed`), false)
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('formId') formId: string,
    // TODO: replace with @CurrentUser() user: SessionUser once AuthGuard is implemented
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      formId,
      uploadedBy,
    )
  }
}
