import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DidLogicClient } from './didlogic.client';

@Injectable()
export class DidLogicService {
  private readonly logger = new Logger(DidLogicService.name);

  constructor(private client: DidLogicClient) {}

  /**
   * Покупка конкретного номера. Судя по публично доступному примеру ответа
   * (в реализации официального MCP-инструмента purchase_did), покупка у
   * DIDLogic синхронна — номер подтверждается сразу в ответе, без отдельного
   * шага "заказ создан, статус узнаем позже" как у DIDWW.
   *
   * Если для номера требуются документы (`require_docs` непусто), считаем
   * его "pending" — звонить с него нельзя, пока в личном кабинете DIDLogic
   * не подтвердят регуляторные документы.
   */
  async purchaseNumber(rawNumber: string) {
    const number = rawNumber.replace(/[^\d]/g, '');
    if (!number) {
      throw new BadRequestException('Номер для покупки у DIDLogic должен быть в формате E.164, например 380441234567');
    }

    const result = await this.client.purchaseNumber(number);
    const purchase = result?.purchase?.purchases?.[0];

    if (result?.purchase?.errors && Object.keys(result.purchase.errors).length > 0) {
      throw new BadRequestException(
        `DIDLogic отклонил покупку: ${JSON.stringify(result.purchase.errors)}`,
      );
    }

    if (!purchase) {
      throw new BadRequestException('DIDLogic не вернул данные о купленном номере — проверьте номер и баланс');
    }

    this.logger.log(`DIDLogic number purchased: ${purchase.number} (id ${purchase.id})`);

    return {
      didId: String(purchase.id),
      phoneNumber: `+${purchase.number}`,
      requiresDocs: !!purchase.require_docs,
    };
  }
}
