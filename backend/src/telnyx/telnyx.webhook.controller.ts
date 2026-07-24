import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyTelnyxSignature } from '../common/telnyx-signature.util';
import { PoolService } from '../pool/pool.service';

@Controller('api/telnyx/webhooks')
export class TelnyxWebhookController {
  private readonly logger = new Logger(TelnyxWebhookController.name);

  constructor(
    private poolService: PoolService,
    private config: ConfigService,
  ) {}

  @Post('telnyx')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any,
    @Headers('telnyx-signature-ed25519') signature: string,
    @Headers('telnyx-timestamp') timestamp: string,
    @Req() req: any,
  ) {
    const publicKey = this.config.get<string>('TELNYX_WEBHOOK_PUBLIC_KEY');

    if (publicKey && signature && timestamp) {
      const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(payload);
      const isValid = verifyTelnyxSignature(rawBody, signature, timestamp, publicKey);
      if (!isValid) {
        throw new BadRequestException('Невалидная подпись вебхука');
      }
    }

    const eventType = payload?.data?.event_type;
    const eventPayload = payload?.data?.payload;

    this.logger.log(`Webhook event: ${eventType}`);

    switch (eventType) {
      case 'number_order.completed': {
        const phoneNumber = eventPayload?.phone_numbers?.[0]?.phone_number;
        const providerNumberId = eventPayload?.phone_numbers?.[0]?.id;
        if (phoneNumber) {
          await this.poolService.markNumberActive(phoneNumber, providerNumberId);
          await this.poolService.markOrderStatus(eventPayload.id, 'completed');
        }
        break;
      }
      case 'number_order.failed': {
        const phoneNumber = eventPayload?.phone_numbers?.[0]?.phone_number;
        if (phoneNumber) {
          await this.poolService.markNumberFailed(phoneNumber);
          await this.poolService.markOrderStatus(
            eventPayload.id,
            'failed',
            eventPayload?.failure_reason,
          );
        }
        break;
      }
      default:
        // Остальные события (звонки, статусы транка и т.д.) можно обработать здесь позже
        break;
    }

    return { received: true };
  }
}
