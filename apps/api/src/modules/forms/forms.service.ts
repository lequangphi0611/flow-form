import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    // TODO: filter by authenticated user
    return this.prisma.form.findMany({ orderBy: { updatedAt: 'desc' } })
  }

  async findOne(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id } })
    if (!form) throw new NotFoundException('Form không tồn tại')
    return form
  }

  create(data: unknown) {
    // TODO: validate with formSchemaValidator, attach ownerId from session
    return this.prisma.form.create({ data: data as any })
  }

  update(id: string, data: unknown) {
    return this.prisma.form.update({ where: { id }, data: data as any })
  }

  publish(id: string) {
    return this.prisma.form.update({ where: { id }, data: { published: true } })
  }

  remove(id: string) {
    return this.prisma.form.delete({ where: { id } })
  }
}
