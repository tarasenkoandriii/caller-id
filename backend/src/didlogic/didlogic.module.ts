import { Module } from '@nestjs/common';
import { DidLogicClient } from './didlogic.client';
import { DidLogicService } from './didlogic.service';

@Module({
  providers: [DidLogicClient, DidLogicService],
  exports: [DidLogicService],
})
export class DidLogicModule {}
