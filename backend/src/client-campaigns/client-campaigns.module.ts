import { Module } from '@nestjs/common';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { CallsModule } from '../calls/calls.module';
import { VoiceoverModule } from '../voiceover/voiceover.module';
import { ClientCampaignsService } from './client-campaigns.service';
import { ClientCampaignsController } from './client-campaigns.controller';
import { ClientVoiceoverController } from './client-voiceover.controller';
import { CronController } from './cron.controller';

@Module({
  imports: [ClientAuthModule, CallsModule, VoiceoverModule],
  controllers: [ClientCampaignsController, ClientVoiceoverController, CronController],
  providers: [ClientCampaignsService],
  exports: [ClientCampaignsService],
})
export class ClientCampaignsModule {}
