import { Module } from '@nestjs/common';
import { DidwwClient } from './didww.client';
import { DidwwService } from './didww.service';
import { DidwwWebhookController } from './didww.webhook.controller';

@Module({
  controllers: [DidwwWebhookController],
  providers: [DidwwClient, DidwwService],
  exports: [DidwwService],
})
export class DidwwModule {}
