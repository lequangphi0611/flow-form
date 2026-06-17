import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common'
import type { ZodSchema } from 'zod'

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        type: 'https://flowform.dev/errors/validation',
        title: 'Validation Failed',
        status: 400,
        detail: 'Request body failed schema validation',
        errors: result.error.flatten().fieldErrors,
      })
    }
    return result.data
  }
}
