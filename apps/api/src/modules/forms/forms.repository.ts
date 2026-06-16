import { Injectable } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PrismaService } from '../../prisma/prisma.service'
import { DEFAULT_THEME, DEFAULT_SETTINGS } from '@flowform/types'
import type { FormSchema, FormStatus, StepSchema, ThemeConfig, FormSettings } from '@flowform/types'

type RawForm = {
  id: string
  title: string
  description: string | null
  schema: unknown
  settings: unknown
  theme: unknown
  status: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  _count: { responses: number }
}

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(ownerId: string): Promise<FormSchema[]> {
    const rows = (await this.prisma.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    })) as unknown as RawForm[]
    return rows.map((r) => this.hydrate(r))
  }

  async findById(id: string): Promise<FormSchema | null> {
    const row = await this.prisma.form.findUnique({
      where: { id },
      include: { _count: { select: { responses: true } } },
    })
    return row ? this.hydrate(row as RawForm) : null
  }

  async create(ownerId: string, title: string): Promise<FormSchema> {
    const row = await this.prisma.form.create({
      data: {
        ownerId,
        title,
        status: 'draft',
        schema: { steps: [] },
        settings: DEFAULT_SETTINGS as object,
        theme: DEFAULT_THEME as object,
      },
      include: { _count: { select: { responses: true } } },
    })
    return this.hydrate(row as RawForm)
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.form.delete({ where: { id } })
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        return
      }
      throw err
    }
  }

  private hydrate(raw: RawForm): FormSchema {
    const schema = raw.schema as { steps?: StepSchema[] } | null
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      steps: schema?.steps ?? [],
      settings: (raw.settings as FormSettings) ?? DEFAULT_SETTINGS,
      theme: (raw.theme as ThemeConfig) ?? DEFAULT_THEME,
      status: raw.status as FormStatus,
      responseCount: raw._count.responses,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    }
  }
}
