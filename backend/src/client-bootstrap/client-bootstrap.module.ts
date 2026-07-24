import { Module } from '@nestjs/common';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientContactsModule } from '../client-contacts/client-contacts.module';
import { VoiceoverModule } from '../voiceover/voiceover.module';
import { ClientCampaignsModule } from '../client-campaigns/client-campaigns.module';
import { CallsModule } from '../calls/calls.module';
import { ClientBootstrapController } from './client-bootstrap.controller';

@Module({
  imports: [
    ClientAuthModule,
    ClientContactsModule,
    VoiceoverModule,
    ClientCampaignsModule,
    CallsModule,
  ],
  controllers: [ClientBootstrapController],
})
export class ClientBootstrapModule {}
