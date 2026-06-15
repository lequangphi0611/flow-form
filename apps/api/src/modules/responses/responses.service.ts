import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  submit(formId: string, data: unknown) {
    return this.prisma.formResponse.create({
      data: {
        formId,
        sessionId: (data as any).sessionId ?? crypto.randomUUID(),
        data: (data as any).data ?? {},
        completedAt: new Date(),
      },
    })
  }

  saveDraft(formId: string, data: unknown) {
    return this.prisma.formResponse.upsert({
      where: { id: (data as any).responseId ?? '' },
      create: {
        formId,
        sessionId: (data as any).sessionId ?? crypto.randomUUID(),
        data: (data as any).data ?? {},
      },
      update: { data: (data as any).data ?? {} },
    })
  }

  findAll(formId: string, _query: unknown) {
    return this.prisma.formResponse.findMany({
      where: { formId, completedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
