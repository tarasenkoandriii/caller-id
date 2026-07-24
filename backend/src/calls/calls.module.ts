import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { TelnyxAccountsModule } from '../telnyx-accounts/telnyx-accounts.module';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsWebhookController } from './calls.webhook.controller';

@Module({
  imports: [
    TelnyxModule,
    TelnyxAccountsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [CallsController, CallsWebhookController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
