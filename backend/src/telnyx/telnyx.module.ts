import { Module } from '@nestjs/common';
import { TelnyxClient } from './telnyx.client';

/**
 * Листовой модуль: только клиент, непосредственно работающий с Telnyx API.
 * Провайдер-нейтральная диспетчеризация (бывший TelnyxService) переехала в
 * PoolModule (src/pool/), а Telnyx-специфичный вебхук — в
 * telnyx.webhook.controller.ts, который регистрируется в PoolModule (ему
 * нужен PoolService), но физически остаётся здесь, рядом с остальным кодом,
 * работающим напрямую с Telnyx.
 */
@Module({
  providers: [TelnyxClient],
  exports: [TelnyxClient],
})
export class TelnyxModule {}
