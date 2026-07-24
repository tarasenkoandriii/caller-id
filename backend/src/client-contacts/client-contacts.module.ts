import { Module } from '@nestjs/common';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientContactsService } from './client-contacts.service';
import { ClientContactsController } from './client-contacts.controller';

@Module({
  imports: [ClientAuthModule],
  controllers: [ClientContactsController],
  providers: [ClientContactsService],
  exports: [ClientContactsService],
})
export class ClientContactsModule {}
