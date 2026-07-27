import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { CallsModule } from '../calls/calls.module';
import { VoiceoverModule } from '../voiceover/voiceover.module';
import { ClientCampaignsService } from './client-campaigns.service';
import { ClientCampaignsController } from './client-campaigns.controller';
import { ClientVoiceoverController } from './client-voiceover.controller';
import { CronController } from './cron.controller';

@Module({
  imports: [
    ClientAuthModule,
    CallsModule,
    VoiceoverModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ClientCampaignsController, ClientVoiceoverController, CronController],
  providers: [ClientCampaignsService],
  exports: [ClientCampaignsService],
})
export class ClientCampaignsModule {}
