import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PoolModule } from './pool/pool.module';
import { AdminsModule } from './admins/admins.module';
import { VoiceoverModule } from './voiceover/voiceover.module';
import { CallsModule } from './calls/calls.module';
import { TelnyxAccountsModule } from './telnyx-accounts/telnyx-accounts.module';
import { ClientAuthModule } from './client-auth/client-auth.module';
import { ClientContactsModule } from './client-contacts/client-contacts.module';
import { ClientCampaignsModule } from './client-campaigns/client-campaigns.module';
import { ClientBootstrapModule } from './client-bootstrap/client-bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PoolModule,
    AdminsModule,
    VoiceoverModule,
    CallsModule,
    TelnyxAccountsModule,
    ClientAuthModule,
    ClientContactsModule,
    ClientCampaignsModule,
    ClientBootstrapModule,
  ],
})
export class AppModule {}
