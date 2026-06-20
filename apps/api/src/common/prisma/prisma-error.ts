import { ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

interface PrismaErrorContext {
  notFoundDetail?: string
  conflictDetail?: string
}

// Map known Prisma error codes to RFC 7807 HTTP exceptions at the repository layer
// (rule api/03 §6). Anything unmapped is re-thrown so the global HttpExceptionFilter
// turns it into a logged, opaque 500. Return type `never` — always throws.
export function throwMappedPrismaError(err: unknown, context: PrismaErrorContext = {}): never {
  if (err instanceof PrismaClientKnownRequestError) {
    // P2025 — record required for the operation was not found
    if (err.code === 'P2025') {
      throw new NotFoundException({
        type: 'https://flowform.dev/errors/not-found',
        title: 'Resource Not Found',
        status: 404,
        detail: context.notFoundDetail ?? 'The requested resource does not exist.',
      })
    }
    // P2002 — unique constraint violation
    if (err.code === 'P2002') {
      throw new ConflictException({
        type: 'https://flowform.dev/errors/conflict',
        title: 'Resource Conflict',
        status: 409,
        detail: context.conflictDetail ?? 'A resource with the same unique value already exists.',
      })
    }
  }
  throw err
}
