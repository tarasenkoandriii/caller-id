import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelnyxClient } from '../telnyx/telnyx.client';

function maskKey(apiKey: string) {
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

@Injectable()
export class TelnyxAccountsService {
  constructor(
    private prisma: PrismaService,
    private client: TelnyxClient,
  ) {}

  /** Первый созданный аккаунт автоматически становится активным */
  async create(label: string, apiKey: string, connectionId: string) {
    const existingCount = await this.prisma.telnyxAccount.count();
    return this.prisma.telnyxAccount.create({
      data: { label, apiKey, connectionId, isActive: existingCount === 0 },
    });
  }

  async setEnabled(id: string, enabled: boolean) {
    const account = await this.prisma.telnyxAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Аккаунт не найден');
    return this.prisma.telnyxAccount.update({
      where: { id },
      // Отключая активный аккаунт, заодно снимаем с него isActive — иначе
      // он остался бы "отмеченным галочкой", хотя PoolService/CallsService
      // его больше не выберут (getDefaultAccount фильтрует по enabled).
      data: { enabled, isActive: enabled ? account.isActive : false },
    });
  }

  /**
   * Делает аккаунт активным (используется по умолчанию для заказа номеров
   * и звонков) — ровно один аккаунт может быть активным одновременно, все
   * остальные автоматически снимаются с активности в той же транзакции.
   */
  async setActive(id: string) {
    const account = await this.prisma.telnyxAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Аккаунт не найден');
    if (!account.enabled) {
      throw new BadRequestException('Нельзя сделать активным отключённый аккаунт — сначала включите его');
    }

    await this.prisma.$transaction([
      this.prisma.telnyxAccount.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.telnyxAccount.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return { activated: id };
  }

  async remove(id: string) {
    const numbersCount = await this.prisma.poolNumber.count({
      where: { telnyxAccountId: id, status: { in: ['active', 'pending'] } },
    });
    if (numbersCount > 0) {
      throw new BadRequestException(
        `На этом аккаунте ещё ${numbersCount} активных/ожидающих номеров — сначала освободите их`,
      );
    }
    await this.prisma.telnyxAccount.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Карточки для вкладки "Telnyx": по каждому аккаунту — баланс и статус
   * Call Control Application живьём из Telnyx, плюс количество номеров из
   * своей БД. Если Telnyx недоступен для конкретного аккаунта (невалидный
   * ключ и т.п.) — не роняем весь список, а помечаем карточку ошибкой.
   */
  async listWithStats() {
    const accounts = await this.prisma.telnyxAccount.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      accounts.map(async (account) => {
        const numbersCount = await this.prisma.poolNumber.count({
          where: { telnyxAccountId: account.id, status: { in: ['active', 'pending'] } },
        });

        let balance: { amount: string; currency: string } | null = null;
        let connectionActive: boolean | null = null;
        let error: string | null = null;

        try {
          const [balanceRes, connectionRes] = await Promise.all([
            this.client.getBalance(account.apiKey),
            this.client.getConnectionStatus(account.connectionId, account.apiKey),
          ]);
          balance = {
            amount: balanceRes.data?.balance,
            currency: balanceRes.data?.currency,
          };
          connectionActive = !!connectionRes.data?.active;
        } catch (err: any) {
          error = err.message || 'Не удалось получить данные от Telnyx';
        }

        return {
          id: account.id,
          label: account.label,
          apiKeyMasked: maskKey(account.apiKey),
          connectionId: account.connectionId,
          enabled: account.enabled,
          isActive: account.isActive,
          numbersCount,
          balance,
          connectionActive,
          error,
          createdAt: account.createdAt,
        };
      }),
    );
  }

  /**
   * Аккаунт по умолчанию для заказа новых Telnyx-номеров и звонков.
   * Приоритет: явно отмеченный активным (isActive) → иначе первый включённый
   * по дате добавления (для аккаунтов, созданных до появления isActive).
   */
  async getDefaultAccount() {
    const active = await this.prisma.telnyxAccount.findFirst({
      where: { isActive: true, enabled: true },
    });
    if (active) return active;

    return this.prisma.telnyxAccount.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(id: string) {
    return this.prisma.telnyxAccount.findUnique({ where: { id } });
  }
}
