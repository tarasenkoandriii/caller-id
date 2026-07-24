import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClientJwtGuard } from '../client-auth/client-jwt.guard';
import { ClientUser } from '../client-auth/client-user.decorator';
import { VoiceoverService } from '../voiceover/voiceover.service';
import { CreateVoiceoverDto } from '../voiceover/create-voiceover.dto';

@Controller('client-voiceovers')
@UseGuards(ClientJwtGuard)
export class ClientVoiceoverController {
  constructor(private voiceoverService: VoiceoverService) {}

  @Get('voices')
  listVoices() {
    return this.voiceoverService.listVoices();
  }

  @Get()
  list(@ClientUser() user: { sub: string }) {
    return this.voiceoverService.listVoiceoversForOwner(user.sub);
  }

  @Post()
  create(@ClientUser() user: { sub: string }, @Body() dto: CreateVoiceoverDto) {
    return this.voiceoverService.createVoiceoverForOwner(
      user.sub,
      dto.text,
      dto.voiceId,
      dto.voiceName,
    );
  }
}
