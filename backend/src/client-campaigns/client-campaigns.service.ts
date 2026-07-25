import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallsService } from '../calls/calls.service';

/**
 * Простой планировщик обзвона с клиентской страницы "/". Три режима:
 *  - "now"      — обзвонить весь список номеров прямо сейчас.
 *  - "once"     — обзвонить один раз в указанное время сегодня.
 *  - "interval" — обзванивать весь список раз в N минут.
 *
 * Важно: без постоянного воркера (см. doc/CLIENT_PAGE_SETUP.md) "once" и
 * "interval" реально запускаются только когда cron-эндпоинт
 * (POST /cron/dispatch-campaigns) кто-то дёргает — Vercel Cron на Hobby-плане
 * поддерживает только ежедневный интервал, для более частого запуска нужен
 * либо Vercel Pro, либо внешний пинг (cron-job.org и т.п.).
 */
@Injectable()
export class ClientCampaignsService {
  private readonly logger = new Logger(ClientCampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private calls: CallsService,
  ) {}

  async create(
    ownerId: string,
    params: { voiceoverId: string; scheduleType: string; scheduleAt?: string; intervalMinutes?: number },
  ) {
    const voiceover = await this.prisma.voiceover.findUnique({ where: { id: params.voiceoverId } });
    if (!voiceover || voiceover.ownerId !== ownerId) {
      throw new BadRequestException('Озвучка не найдена — сначала сгенерируйте её');
    }

    const contactsCount = await this.prisma.clientContact.count({ where: { ownerId } });
    if (contactsCount === 0) {
      throw new BadRequestException('Список номеров для обзвона пуст — добавьте хотя бы один номер');
    }

    let nextRunAt: Date;
    if (params.scheduleType === 'now') {
      nextRunAt = new Date();
    } else if (params.scheduleType === 'once') {
      if (!params.scheduleAt) {
        throw new BadRequestException('Для разового запуска укажите время (scheduleAt)');
      }
      nextRunAt = new Date(params.scheduleAt);
      if (nextRunAt.getTime() < Date.now() - 60_000) {
        throw new BadRequestException('Указанное время уже в прошлом');
      }
    } else if (params.scheduleType === 'interval') {
      if (!params.intervalMinutes || params.intervalMinutes < 1) {
        throw new BadRequestException('Укажите интервал в минутах (не менее 1)');
      }
      nextRunAt = new Date();
    } else {
      throw new BadRequestException(`Неизвестный тип расписания: ${params.scheduleType}`);
    }

    const campaign = await this.prisma.clientCampaign.create({
      data: {
        ownerId,
        voiceoverId: params.voiceoverId,
        scheduleType: params.scheduleType,
        scheduleAt: params.scheduleAt ? new Date(params.scheduleAt) : null,
        intervalMinutes: params.intervalMinutes,
        nextRunAt,
        status: 'scheduled',
      },
    });

    // "now" — не ждём cron, запускаем сразу же в рамках этого же запроса.
    if (params.scheduleType === 'now') {
      await this.dispatch(campaign.id);
    }

    return campaign;
  }

  listForOwner(ownerId: string) {
    return this.prisma.clientCampaign.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /** Обзванивает весь список контактов владельца кампании */
  async dispatch(campaignId: string, opts: { alreadyClaimed?: boolean } = {}) {
    const campaign = await this.prisma.clientCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Кампания не найдена');

    if (!opts.alreadyClaimed) {
      await this.prisma.clientCampaign.update({
        where: { id: campaignId },
        data: { status: 'running' },
      });
    }

    const contacts = await this.prisma.clientContact.findMany({
      where: { ownerId: campaign.ownerId },
    });

    let succeeded = 0;
    let failed = 0;
    for (const contact of contacts) {
      try {
        await this.calls.initiateTestCall(contact.phoneNumber, campaign.voiceoverId, {
          ownerId: campaign.ownerId,
          campaignId: campaign.id,
        });
        succeeded++;
      } catch (err: any) {
        failed++;
        this.logger.warn(`Campaign ${campaignId}: call to ${contact.phoneNumber} failed: ${err.message}`);
      }
    }

    this.logger.log(`Campaign ${campaignId} dispatched: ${succeeded} ok, ${failed} failed`);

    if (campaign.scheduleType === 'interval') {
      await this.prisma.clientCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'scheduled',
          nextRunAt: new Date(Date.now() + campaign.intervalMinutes! * 60_000),
        },
      });
    } else {
      await this.prisma.clientCampaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });
    }

    return { succeeded, failed };
  }

  /**
   * Вызывается cron-диспетчером (см. pg_cron в doc/CLIENT_PAGE_SETUP.md) —
   * атомарно "забирает" все кампании, которым пора запуститься, одним
   * UPDATE ... RETURNING. Это важно именно при поминутном пинге: если
   * предыдущий вызов ещё не успел завершиться (например, обзванивается
   * длинный список номеров), а pg_cron уже дёрнул эндпоинт снова — SQL
   * не даст двум запускам захватить одну и ту же кампанию (row-level
   * locking на UPDATE), в отличие от отдельных findMany() + update().
   */
  async dispatchDue() {
    const claimed = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "ClientCampaign"
      SET status = 'running', "updatedAt" = now()
      WHERE status = 'scheduled' AND "nextRunAt" <= now()
      RETURNING id
    `;

    const results: Array<{ campaignId: string; succeeded: number; failed: number }> = [];
    for (const { id } of claimed) {
      results.push({ campaignId: id, ...(await this.dispatch(id, { alreadyClaimed: true })) });
    }
    return { processed: results.length, results };
  }

  async cancel(ownerId: string, id: string) {
    const campaign = await this.prisma.clientCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.ownerId !== ownerId) {
      throw new NotFoundException('Кампания не найдена');
    }
    await this.prisma.clientCampaign.update({ where: { id }, data: { status: 'cancelled' } });
    return { cancelled: true };
  }
}
