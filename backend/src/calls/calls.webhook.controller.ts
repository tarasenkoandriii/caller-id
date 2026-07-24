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
import { CallsService } from './calls.service';

@Controller('calls/webhooks')
export class CallsWebhookController {
  private readonly logger = new Logger(CallsWebhookController.name);

  constructor(
    private callsService: CallsService,
    private config: ConfigService,
  ) {}

  @Post('telnyx-call')
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
    const callControlId = payload?.data?.payload?.call_control_id;

    this.logger.log(`Call webhook event: ${eventType}`);

    if (!callControlId) return { received: true };

    switch (eventType) {
      case 'call.answered':
        await this.callsService.handleCallAnswered(callControlId);
        break;
      case 'call.hangup':
        await this.callsService.handleCallHangup(callControlId);
        break;
      case 'call.machine.detection.ended':
        // Опционально: если попадёт автоответчик, можно завершить звонок,
        // не проигрывая озвучку — сейчас playback идёт при любом ответе.
        break;
      default:
        break;
    }

    return { received: true };
  }
}
