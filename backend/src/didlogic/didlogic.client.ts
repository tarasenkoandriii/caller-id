import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DIDLogic API — базовый URL и два подтверждённых эндпоинта взяты из
 * официального README и опубликованной реализации open-source MCP-сервера
 * для DIDLogic (github.com/UserAd/didlogic_mcp), так как публичной
 * человекочитаемой REST-документации по адресам эндпоинтов у DIDLogic
 * заметно меньше, чем у Telnyx/DIDWW.
 *
 * ВАЖНО: авторизация ниже реализована как `Authorization: Bearer <ключ>` по
 * общепринятому соглашению (так же выглядит сама аутентификация в MCP-сервере
 * DIDLogic) — это НЕ подтверждено напрямую в официальной документации
 * DIDLogic и должно быть проверено первым реальным запросом с вашим ключом
 * перед продакшеном. Если API вернёт 401, скорее всего нужен другой формат
 * заголовка — сверьтесь с личным кабинетом DIDLogic (там же выдаётся ключ).
 *
 * Также: DIDLogic API доступен только с тарифа Plus и выше — на более
 * низких тарифах ключ попросту не выдадут.
 */
@Injectable()
export class DidLogicClient {
  private readonly baseUrl = 'https://app.didlogic.com/api';

  constructor(private config: ConfigService) {}

  private headers() {
    const apiKey = this.config.get<string>('DIDLOGIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('DIDLOGIC_API_KEY не задан');
    }
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async handle(res: Response) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body?.error || body?.message || res.statusText;
      throw new InternalServerErrorException(`DIDLogic API: ${message}`);
    }
    return body;
  }

  /** GET /v1/balance → { balance: number } */
  async getBalance() {
    const res = await fetch(`${this.baseUrl}/v1/balance`, { headers: this.headers() });
    return this.handle(res);
  }

  /**
   * Покупка КОНКРЕТНОГО номера в формате E.164 (например "380441234567").
   * В отличие от Telnyx/DIDWW, публично подтверждённого эндпоинта "найди
   * мне любой доступный номер по стране" для DIDLogic нет — номер нужно
   * знать заранее (посмотреть в личном кабинете DIDLogic → Buy).
   */
  async purchaseNumber(didNumber: string) {
    const res = await fetch(`${this.baseUrl}/v2/buy/purchase`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ did_numbers: didNumber }),
    });
    return this.handle(res);
  }

  /** GET /v2/purchases?page=&per_page= — список уже купленных номеров */
  async listPurchases(page = 1, perPage = 50) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const res = await fetch(`${this.baseUrl}/v2/purchases?${params}`, {
      headers: this.headers(),
    });
    return this.handle(res);
  }
}
