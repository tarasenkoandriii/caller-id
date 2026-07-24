import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { TelnyxAccountsService } from './telnyx-accounts.service';
import { TelnyxSettingsService } from './telnyx-settings.service';
import { TelnyxAccountsController } from './telnyx-accounts.controller';

@Module({
  imports: [
    TelnyxModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [TelnyxAccountsController],
  providers: [TelnyxAccountsService, TelnyxSettingsService],
  exports: [TelnyxAccountsService, TelnyxSettingsService],
})
export class TelnyxAccountsModule {}
