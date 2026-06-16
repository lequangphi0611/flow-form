import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { SubmitResponseDto, SaveDraftResponseDto } from '@flowform/validators'

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  submit(formId: string, dto: SubmitResponseDto) {
    return this.prisma.formResponse.create({
      data: {
        formId,
        sessionId: dto.sessionId ?? crypto.randomUUID(),
        data: dto.data,
        completedAt: new Date(),
      },
    })
  }

  saveDraft(formId: string, dto: SaveDraftResponseDto) {
    return this.prisma.formResponse.upsert({
      where: { id: dto.responseId ?? '' },
      create: {
        formId,
        sessionId: dto.sessionId ?? crypto.randomUUID(),
        data: dto.data,
      },
      update: { data: dto.data },
    })
  }

  findAll(formId: string) {
    return this.prisma.formResponse.findMany({
      where: { formId, completedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
