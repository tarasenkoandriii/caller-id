import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DidwwClient } from './didww.client';

@Injectable()
export class DidwwService {
  private readonly logger = new Logger(DidwwService.name);

  constructor(
    private client: DidwwClient,
    private config: ConfigService,
  ) {}

  /**
   * Заказывает один украинский номер. DIDWW не всегда возвращает готовый
   * номер синхронно (заказ может быть Pending) — поэтому возвращаем только
   * orderId и статус заказа, а сам номер выясняется либо сразу через
   * findAssignedNumber(), либо позже через вебхук.
   */
  async provisionUkraineNumber() {
    const country = await this.client.findCountry('UA');
    if (!country) {
      throw new BadRequestException('DIDWW: страна Украина не найдена в покрытии аккаунта');
    }

    const groups = await this.client.findDidGroupsWithSkus(country.id);
    const firstGroup = groups.data?.[0];
    if (!firstGroup) {
      throw new BadRequestException('DIDWW: нет доступных DID Groups для Украины прямо сейчас');
    }

    const sku = (groups.included || []).find(
      (item: any) => item.type === 'stock_keeping_units',
    );
    if (!sku) {
      throw new BadRequestException('DIDWW: для найденной DID Group нет доступных SKU (тарифов)');
    }

    const publicBackendUrl = this.config.get<string>('PUBLIC_BACKEND_URL');
    const callbackUrl = publicBackendUrl
      ? `${publicBackendUrl}/didww/webhooks/order-status`
      : undefined;

    const order = await this.client.createOrder(sku.id, 1, callbackUrl);
    const orderId = order.data?.id;
    const status = order.data?.attributes?.status; // "Pending" | "Completed" | ...

    this.logger.log(`DIDWW order placed: ${orderId} (status ${status})`);

    return { orderId, status };
  }

  /** Возвращает номер, назначенный заказу, если он уже известен */
  async findAssignedNumber(orderId: string) {
    const dids = await this.client.getDidsForOrder(orderId);
    const did = dids.data?.[0];
    if (!did) return null;
    return { didId: did.id as string, phoneNumber: did.attributes?.number as string };
  }
}
