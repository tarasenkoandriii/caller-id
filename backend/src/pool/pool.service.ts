import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelnyxClient } from '../telnyx/telnyx.client';
import { DidwwService } from '../didww/didww.service';
import { DidLogicService } from '../didlogic/didlogic.service';
import { TelnyxAccountsService } from '../telnyx-accounts/telnyx-accounts.service';

const MAX_NUMBERS = 50;
const SUPPORTED_PROVIDERS = ['telnyx', 'didww', 'didlogic'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);

  constructor(
    private client: TelnyxClient,
    private prisma: PrismaService,
    private config: ConfigService,
    private didwwService: DidwwService,
    private didLogicService: DidLogicService,
    private telnyxAccounts: TelnyxAccountsService,
  ) {}

  /**
   * Статус подключения: баланс + Call Control Application аккаунта по
   * умолчанию (первый включённый в таблице TelnyxAccount). Если ни одного
   * аккаунта ещё не добавлено во вкладке "Telnyx" — используется legacy
   * TELNYX_API_KEY/TELNYX_CONNECTION_ID из .env, как раньше, до появления
   * мультиаккаунта.
   */
  async getStatus() {
    const account = await this.telnyxAccounts.getDefaultAccount();
    const apiKey = account?.apiKey;
    const connectionId = account?.connectionId || this.config.get<string>('TELNYX_CONNECTION_ID');
    if (!connectionId) {
      throw new BadRequestException(
        'Не задан TELNYX_CONNECTION_ID — ни у аккаунта, ни в legacy env-переменной',
      );
    }

    const [balance, connection] = await Promise.all([
      this.client.getBalance(apiKey),
      this.client.getConnectionStatus(connectionId, apiKey),
    ]);

    return {
      account: account ? { id: account.id, label: account.label } : null,
      balance: {
        amount: balance.data?.balance,
        currency: balance.data?.currency,
        creditLimit: balance.data?.credit_limit,
      },
      connection: {
        id: connection.data?.id,
        name: connection.data?.connection_name,
        active: connection.data?.active,
      },
    };
  }

  /** Список номеров из своей БД (обновляется вебхуком, не дергает Telnyx на каждый рендер) */
  async listNumbers() {
    return this.prisma.poolNumber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ручная синхронизация с Telnyx — на случай, если вебхук
   * number_order.completed не долетел (например, адрес вебхука в Telnyx
   * Portal был настроен на устаревший путь, или сам вебхук временно не
   * отвечал) и номер реально куплен на стороне Telnyx, но в нашей БД его
   * нет или он "завис" в статусе pending. Подтягивает ВСЕ номера аккаунта
   * по умолчанию напрямую из Telnyx (GET /phone_numbers) и либо создаёт
   * недостающие записи, либо обновляет статус уже существующих.
   */
  async syncFromTelnyx() {
    const account = await this.telnyxAccounts.getDefaultAccount();
    const apiKey = account?.apiKey;

    const owned = await this.client.listOwnedNumbers(apiKey);
    const numbers = owned.data || [];

    let created = 0;
    let updated = 0;

    for (const n of numbers) {
      const phoneNumber = n.phone_number;
      if (!phoneNumber) continue;

      const status = n.status === 'active' ? 'active' : 'pending';
      const existing = await this.prisma.poolNumber.findUnique({ where: { phoneNumber } });

      if (existing) {
        if (existing.status !== status || existing.providerNumberId !== n.id) {
          await this.prisma.poolNumber.update({
            where: { phoneNumber },
            data: { status, providerNumberId: n.id },
          });
          updated++;
        }
      } else {
        await this.prisma.poolNumber.create({
          data: {
            phoneNumber,
            status,
            provider: 'telnyx',
            providerNumberId: n.id,
            connectionId: n.connection_id,
            countryCode: 'UA',
            telnyxAccountId: account?.id,
          },
        });
        created++;
      }
    }

    this.logger.log(
      `Telnyx sync: ${created} создано, ${updated} обновлено (всего на аккаунте: ${numbers.length})`,
    );

    return { created, updated, total: numbers.length };
  }

  /** Заказ нового номера — выпадающий список провайдеров на кнопке "Добавить номер" */
  async provisionNewNumber(provider: string = 'telnyx', number?: string) {
    if (!SUPPORTED_PROVIDERS.includes(provider as Provider)) {
      throw new BadRequestException(
        `Провайдер "${provider}" пока не подключён — доступны Telnyx, DIDWW и DIDLogic.`,
      );
    }

    const existingCount = await this.prisma.poolNumber.count({
      where: { status: { in: ['active', 'pending'] } },
    });
    if (existingCount >= MAX_NUMBERS) {
      throw new BadRequestException(
        `Достигнут лимит номеров (${MAX_NUMBERS}). Освободите неиспользуемый номер перед заказом нового.`,
      );
    }

    if (provider === 'didww') {
      return this.provisionDidwwNumber();
    }

    if (provider === 'didlogic') {
      return this.provisionDidLogicNumber(number);
    }

    return this.provisionTelnyxNumber();
  }

  private async provisionTelnyxNumber() {
    const account = await this.telnyxAccounts.getDefaultAccount();
    const apiKey = account?.apiKey;
    const connectionId = account?.connectionId || this.config.get<string>('TELNYX_CONNECTION_ID');

    if (!connectionId) {
      throw new BadRequestException(
        'Нет ни одного Telnyx-аккаунта — добавьте его во вкладке "Telnyx", прежде чем заказывать номера.',
      );
    }

    const available = await this.client.searchAvailableNumbers('UA', 1, apiKey);
    const candidate = available.data?.[0]?.phone_number;
    if (!candidate) {
      throw new BadRequestException(
        'Нет доступных номеров Украины у Telnyx прямо сейчас. Попробуйте позже.',
      );
    }

    const order = await this.client.orderNumber(candidate, connectionId, apiKey);
    const orderId = order.data?.id;

    await this.prisma.poolNumberOrder.create({
      data: {
        providerOrderId: orderId,
        provider: 'telnyx',
        phoneNumber: candidate,
        status: 'pending',
      },
    });

    await this.prisma.poolNumber.upsert({
      where: { phoneNumber: candidate },
      create: {
        phoneNumber: candidate,
        status: 'pending',
        provider: 'telnyx',
        connectionId,
        orderId,
        countryCode: 'UA',
        telnyxAccountId: account?.id,
      },
      update: { status: 'pending', orderId },
    });

    this.logger.log(`Telnyx order placed: ${candidate} (order ${orderId}, account ${account?.label || 'legacy env'})`);

    return { phoneNumber: candidate, orderId, status: 'pending' };
  }

  /**
   * DIDWW не всегда возвращает готовый номер синхронно (заказ может быть
   * "Pending" — станет известен только через вебхук order-status). Поэтому
   * создаём запись-плейсхолдер с временным уникальным номером и обновляем
   * её реальным номером, когда он становится известен — сразу же (если
   * заказ завершился синхронно) либо позже через
   * DidwwWebhookController.
   */
  private async provisionDidwwNumber() {
    const { orderId, status } = await this.didwwService.provisionUkraineNumber();
    const isCompleted = (status || '').toLowerCase() === 'completed';

    await this.prisma.poolNumberOrder.create({
      data: {
        providerOrderId: orderId,
        provider: 'didww',
        phoneNumber: 'pending',
        status: isCompleted ? 'completed' : 'pending',
      },
    });

    let phoneNumber = `pending-didww-${randomUUID()}`;
    let providerNumberId: string | undefined;
    let resolvedStatus: 'active' | 'pending' = 'pending';

    if (isCompleted) {
      const assigned = await this.didwwService.findAssignedNumber(orderId);
      if (assigned) {
        phoneNumber = assigned.phoneNumber;
        providerNumberId = assigned.didId;
        resolvedStatus = 'active';
      }
    }

    await this.prisma.poolNumber.create({
      data: {
        phoneNumber,
        status: resolvedStatus,
        provider: 'didww',
        providerNumberId,
        orderId,
        countryCode: 'UA',
      },
    });

    this.logger.log(`DIDWW order placed: ${orderId} (status ${status})`);

    return { phoneNumber: resolvedStatus === 'active' ? phoneNumber : null, orderId, status: resolvedStatus };
  }

  /**
   * DIDLogic не даёт публично подтверждённого способа автоматически найти
   * "любой доступный номер по стране" (в отличие от Telnyx/DIDWW) — нужно
   * знать конкретный номер заранее (посмотреть в личном кабинете DIDLogic).
   * Поэтому в отличие от других провайдеров здесь обязателен параметр
   * `number` — фронтенд запрашивает его в отдельном поле при выборе DIDLogic.
   */
  private async provisionDidLogicNumber(number?: string) {
    if (!number) {
      throw new BadRequestException(
        'Для DIDLogic нужно указать конкретный номер (E.164) — автопоиска по стране у DIDLogic нет. Посмотрите доступные номера в личном кабинете DIDLogic → Buy.',
      );
    }

    const purchased = await this.didLogicService.purchaseNumber(number);
    const status = purchased.requiresDocs ? 'pending' : 'active';

    await this.prisma.poolNumberOrder.create({
      data: {
        providerOrderId: purchased.didId,
        provider: 'didlogic',
        phoneNumber: purchased.phoneNumber,
        status: status === 'active' ? 'completed' : 'pending',
      },
    });

    await this.prisma.poolNumber.create({
      data: {
        phoneNumber: purchased.phoneNumber,
        status,
        provider: 'didlogic',
        providerNumberId: purchased.didId,
        orderId: purchased.didId,
        countryCode: 'UA',
      },
    });

    this.logger.log(`DIDLogic number provisioned: ${purchased.phoneNumber} (${status})`);

    return { phoneNumber: purchased.phoneNumber, orderId: purchased.didId, status };
  }

  /** Вызывается из вебхука при подтверждении заказа */
  async markNumberActive(phoneNumber: string, providerNumberId: string) {
    await this.prisma.poolNumber.update({
      where: { phoneNumber },
      data: { status: 'active', providerNumberId },
    });
  }

  async markOrderStatus(
    providerOrderId: string,
    status: 'completed' | 'failed',
    failureReason?: string,
  ) {
    await this.prisma.poolNumberOrder.update({
      where: { providerOrderId },
      data: { status, failureReason },
    });
  }

  async markNumberFailed(phoneNumber: string) {
    await this.prisma.poolNumber.updateMany({
      where: { phoneNumber },
      data: { status: 'failed' },
    });
  }
}
