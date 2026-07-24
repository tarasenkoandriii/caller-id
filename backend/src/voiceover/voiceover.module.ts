import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from './elevenlabs.client';
import { VoiceoverService } from './voiceover.service';
import { VoiceoverController } from './voiceover.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [VoiceoverController],
  providers: [ElevenLabsClient, VoiceoverService],
  exports: [VoiceoverService],
})
export class VoiceoverModule {}
