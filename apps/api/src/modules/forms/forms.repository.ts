import { Injectable, Logger } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PrismaService } from '../../prisma/prisma.service'
import { formBodySchema, formSettingsSchema, themeConfigSchema } from '@flowform/validators'
import type { UpdateFormDto } from '@flowform/validators'
import { DEFAULT_THEME, DEFAULT_SETTINGS } from '@flowform/types'
import type { FormSchema, FormStatus } from '@flowform/types'

// Minimal columns needed for the list view (no JSONB blobs)
type RawFormSummary = {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  _count: { responses: number }
}

// Full columns needed for single-form operations (includes JSONB)
type RawForm = RawFormSummary & {
  schema: unknown
  settings: unknown
  theme: unknown
}

@Injectable()
export class FormsRepository {
  private readonly logger = new Logger(FormsRepository.name)

  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(ownerId: string): Promise<FormSchema[]> {
    if (!ownerId) return []
    const rows = (await this.prisma.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { responses: true } },
        // schema, settings, theme intentionally omitted — not needed for list cards
      },
    })) as unknown as RawFormSummary[]
    return rows.map((r) => this.hydrateSummary(r))
  }

  // Minimal fetch for ownership check — used by FormOwnerGuard only
  async findOwnerById(id: string): Promise<{ ownerId: string } | null> {
    return this.prisma.form.findUnique({
      where: { id },
      select: { ownerId: true },
    })
  }

  // Fetch ownership + status — used by FormAccessGuard (cross-module)
  async findStatusById(id: string): Promise<{ ownerId: string; status: string } | null> {
    return this.prisma.form.findUnique({
      where: { id },
      select: { ownerId: true, status: true },
    })
  }

  // Public fetch — only returns published forms (anonymous access)
  async findPublishedById(id: string): Promise<FormSchema | null> {
    const row = await this.prisma.form.findUnique({
      where: { id, status: 'published' },
      include: { _count: { select: { responses: true } } },
    })
    return row ? this.hydrate(row as unknown as RawForm) : null
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

  async update(id: string, dto: UpdateFormDto): Promise<FormSchema> {
    const row = await this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.schema      !== undefined && { schema: dto.schema as object }),
        ...(dto.settings    !== undefined && { settings: dto.settings as object }),
        ...(dto.theme       !== undefined && { theme: dto.theme as object }),
      },
      include: { _count: { select: { responses: true } } },
    })
    return this.hydrate(row as unknown as RawForm)
  }

  async publish(id: string): Promise<FormSchema> {
    const row = await this.prisma.form.update({
      where: { id },
      data: { status: 'published' },
      include: { _count: { select: { responses: true } } },
    })
    return this.hydrate(row as unknown as RawForm)
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

  // List view: no JSONB — returns defaults for steps/settings/theme
  private hydrateSummary(raw: RawFormSummary): FormSchema {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      steps: [],
      settings: DEFAULT_SETTINGS,
      theme: DEFAULT_THEME,
      status: raw.status as FormStatus,
      responseCount: raw._count.responses,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    }
  }

  // Single-form view: parse JSONB through Zod, warn and fallback on corrupt data
  private hydrate(raw: RawForm): FormSchema {
    const schemaResult = formBodySchema.safeParse(raw.schema)
    const settingsResult = formSettingsSchema.safeParse(raw.settings)
    const themeResult = themeConfigSchema.safeParse(raw.theme)

    if (!schemaResult.success) {
      this.logger.warn(`Corrupt schema JSONB in form ${raw.id}: ${schemaResult.error.message}`)
    }
    if (!settingsResult.success) {
      this.logger.warn(`Corrupt settings JSONB in form ${raw.id}: ${settingsResult.error.message}`)
    }
    if (!themeResult.success) {
      this.logger.warn(`Corrupt theme JSONB in form ${raw.id}: ${themeResult.error.message}`)
    }

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      steps: schemaResult.success ? schemaResult.data.steps : [],
      settings: settingsResult.success ? settingsResult.data : DEFAULT_SETTINGS,
      theme: themeResult.success ? themeResult.data : DEFAULT_THEME,
      status: raw.status as FormStatus,
      responseCount: raw._count.responses,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    }
  }
}
