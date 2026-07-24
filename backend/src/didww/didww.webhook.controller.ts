import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DidwwService } from './didww.service';

/**
 * DIDWW шлёт POST на callback_url при смене статуса заказа (см. п. "Create
 * Order" — callback_url/callback_method в теле запроса на создание заказа).
 *
 * ВАЖНО (известное упрощение): DIDWW подписывает такие запросы через
 * HMAC-SHA1 от отсортированных параметров с использованием API-ключа как
 * секрета (см. doc/DIDWW_SETUP.md, раздел про подпись). Проверка подписи
 * здесь ПОКА НЕ реализована — перед продакшеном нужно добавить её по
 * аналогии с проверкой Ed25519 у Telnyx, иначе любой может дёрнуть этот
 * URL и подделать статус заказа/номера.
 *
 * Также точная структура тела запроса не проверена на реальном сэндбоксе
 * DIDWW — ожидаем поля { id, status, type }, как в остальных ресурсах их
 * API, но это стоит подтвердить тестовым вызовом перед продакшеном.
 */
@Controller('api/didww/webhooks')
export class DidwwWebhookController {
  private readonly logger = new Logger(DidwwWebhookController.name);

  constructor(
    private didwwService: DidwwService,
    private prisma: PrismaService,
  ) {}

  @Post('order-status')
  @HttpCode(200)
  async handleOrderStatus(@Body() payload: any) {
    const orderId = payload?.id;
    const status = (payload?.status || '').toLowerCase();

    this.logger.log(`DIDWW order-status webhook: ${orderId} → ${status}`);

    if (!orderId) return { received: true };

    if (status === 'completed') {
      const assigned = await this.didwwService.findAssignedNumber(orderId);

      await this.prisma.poolNumberOrder.updateMany({
        where: { providerOrderId: orderId },
        data: { status: 'completed' },
      });

      if (assigned) {
        await this.prisma.poolNumber.updateMany({
          where: { orderId },
          data: {
            phoneNumber: assigned.phoneNumber,
            providerNumberId: assigned.didId,
            status: 'active',
          },
        });
      }
    } else if (status === 'failed' || status === 'rejected') {
      await this.prisma.poolNumberOrder.updateMany({
        where: { providerOrderId: orderId },
        data: { status: 'failed', failureReason: payload?.reason },
      });
      await this.prisma.poolNumber.updateMany({
        where: { orderId },
        data: { status: 'failed' },
      });
    }

    return { received: true };
  }
}
