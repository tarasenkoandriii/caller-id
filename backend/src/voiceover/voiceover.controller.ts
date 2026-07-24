import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt.guard';
import { VoiceoverService } from './voiceover.service';
import { CreateVoiceoverDto } from './create-voiceover.dto';

@Controller('voiceovers')
@UseGuards(JwtStrategyGuard)
export class VoiceoverController {
  constructor(private voiceoverService: VoiceoverService) {}

  @Get('voices')
  listVoices() {
    return this.voiceoverService.listVoices();
  }

  @Get()
  listVoiceovers() {
    return this.voiceoverService.listVoiceovers();
  }

  @Post()
  create(@Body() dto: CreateVoiceoverDto) {
    return this.voiceoverService.createVoiceover(dto.text, dto.voiceId, dto.voiceName);
  }
}
