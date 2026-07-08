import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

const STATUS_SLUGS: Record<number, string> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'unprocessable-entity',
  429: 'too-many-requests',
  500: 'internal-server-error',
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number
    let body: Record<string, unknown>

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      // Service/guard đã throw đúng Problem Details shape → dùng nguyên
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'type' in exceptionResponse
      ) {
        body = exceptionResponse as Record<string, unknown>
      } else {
        // Wrap NestJS built-in exception sang Problem Details
        body = {
          type: `https://flowform.dev/errors/${this.slugFromStatus(status)}`,
          title: exception.message,
          status,
          detail:
            typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
        }
      }
    } else {
      // Lỗi không mong đợi — log đầy đủ nội bộ, trả về mờ nhạt cho client
      this.logger.error('Unhandled exception', {
        path: request.url,
        exception,
      })

      status = HttpStatus.INTERNAL_SERVER_ERROR
      body = {
        type: 'https://flowform.dev/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred. Please try again later.',
      }
    }

    response.status(status).setHeader('Content-Type', 'application/problem+json').json(body)
  }

  private slugFromStatus(status: number): string {
    return STATUS_SLUGS[status] ?? 'unknown-error'
  }
}
