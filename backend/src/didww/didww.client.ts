import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DIDWW API v3 — JSON:API-совместимый REST-интерфейс для управления
 * инвентарём номеров (DID). В отличие от Telnyx, у DIDWW нет программного
 * "make a call" — это чисто провижининг номеров + SIP-транки для их
 * терминации. См. подробности в doc/DIDWW_SETUP.md.
 */
@Injectable()
export class DidwwClient {
  constructor(private config: ConfigService) {}

  private baseUrl() {
    const environment = this.config.get<string>('DIDWW_ENVIRONMENT') || 'sandbox';
    return environment === 'production'
      ? 'https://api.didww.com/v3'
      : 'https://sandbox-api.didww.com/v3';
  }

  private headers() {
    const apiKey = this.config.get<string>('DIDWW_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('DIDWW_API_KEY не задан');
    }
    return {
      'Api-Key': apiKey,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };
  }

  private async handle(res: Response) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        body?.errors?.[0]?.detail || body?.errors?.[0]?.title || res.statusText;
      throw new InternalServerErrorException(`DIDWW API: ${message}`);
    }
    return body;
  }

  async getBalance() {
    const res = await fetch(`${this.baseUrl()}/balance`, { headers: this.headers() });
    return this.handle(res);
  }

  /** Находит страну по ISO-коду (например 'UA') — нужен её id для поиска DID Groups */
  async findCountry(iso: string) {
    const params = new URLSearchParams({ 'filter[iso]': iso });
    const res = await fetch(`${this.baseUrl()}/countries?${params}`, {
      headers: this.headers(),
    });
    const body = await this.handle(res);
    return body.data?.[0] || null;
  }

  /**
   * DID Groups — пулы номеров, сгруппированные по городу/коду. Включаем
   * stock_keeping_units, чтобы сразу получить доступные SKU (тарифы) для
   * заказа, без отдельного запроса.
   */
  async findDidGroupsWithSkus(countryId: string) {
    const params = new URLSearchParams({
      'filter[country.id]': countryId,
      include: 'stock_keeping_units',
    });
    const res = await fetch(`${this.baseUrl()}/did_groups?${params}`, {
      headers: this.headers(),
    });
    return this.handle(res);
  }

  /**
   * Создаёт заказ на SKU (конкретный тариф/пул номеров). callback_url,
   * если передан, заставит DIDWW прислать вебхук при смене статуса заказа
   * (см. didww.webhook.controller.ts).
   */
  async createOrder(skuId: string, qty: number, callbackUrl?: string) {
    const res = await fetch(`${this.baseUrl()}/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        data: {
          type: 'orders',
          attributes: {
            allow_back_ordering: false,
            ...(callbackUrl
              ? { callback_url: callbackUrl, callback_method: 'POST' }
              : {}),
            items: [
              {
                type: 'did_order_items',
                attributes: { sku_id: skuId, qty },
              },
            ],
          },
        },
      }),
    });
    return this.handle(res);
  }

  async getOrder(orderId: string) {
    const res = await fetch(`${this.baseUrl()}/orders/${orderId}`, {
      headers: this.headers(),
    });
    return this.handle(res);
  }

  /** DID, назначенные конкретному заказу (номер становится известен только здесь) */
  async getDidsForOrder(orderId: string) {
    const params = new URLSearchParams({ 'filter[order.id]': orderId });
    const res = await fetch(`${this.baseUrl()}/dids?${params}`, {
      headers: this.headers(),
    });
    return this.handle(res);
  }
}
