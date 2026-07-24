import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { TelnyxWebhookController } from '../telnyx/telnyx.webhook.controller';
import { DidwwModule } from '../didww/didww.module';
import { DidLogicModule } from '../didlogic/didlogic.module';
import { TelnyxAccountsModule } from '../telnyx-accounts/telnyx-accounts.module';
import { PoolService } from './pool.service';
import { PoolController } from './pool.controller';

/**
 * PoolService — диспетчер по провайдерам (Telnyx/DIDWW/DIDLogic) для пула
 * номеров. Сам по себе провайдер-нейтральный, поэтому живёт отдельно от
 * src/telnyx/, где остался только код, непосредственно работающий с Telnyx
 * API (TelnyxClient) и Telnyx-специфичный вебхук (TelnyxWebhookController).
 *
 * TelnyxWebhookController зарегистрирован здесь, а не в TelnyxModule, только
 * потому что ему нужен PoolService для обновления пула номеров — сама логика
 * вебхука (проверка подписи, парсинг событий Telnyx) при этом не менялась и
 * находится там же, в src/telnyx/telnyx.webhook.controller.ts.
 */
@Module({
  imports: [
    TelnyxModule,
    DidwwModule,
    DidLogicModule,
    TelnyxAccountsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [PoolController, TelnyxWebhookController],
  providers: [PoolService],
})
export class PoolModule {}
