import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUaPhone } from '../calls/ua-phone.util';

@Injectable()
export class ClientContactsService {
  constructor(private prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.clientContact.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(ownerId: string, rawPhoneNumber: string) {
    const phoneNumber = normalizeUaPhone(rawPhoneNumber);
    if (!phoneNumber) {
      throw new BadRequestException(
        'Некорректный украинский номер. Ожидается формат +380XXXXXXXXX',
      );
    }

    const existing = await this.prisma.clientContact.findUnique({
      where: { ownerId_phoneNumber: { ownerId, phoneNumber } },
    });
    if (existing) {
      throw new BadRequestException('Этот номер уже есть в списке');
    }

    return this.prisma.clientContact.create({ data: { ownerId, phoneNumber } });
  }

  async remove(ownerId: string, id: string) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id } });
    if (!contact || contact.ownerId !== ownerId) {
      throw new NotFoundException('Номер не найден');
    }
    await this.prisma.clientContact.delete({ where: { id } });
    return { deleted: true };
  }
}
