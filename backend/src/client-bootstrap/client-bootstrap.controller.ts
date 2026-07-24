import { Body, Controller, Post } from '@nestjs/common';
import { ClientAuthService } from '../client-auth/client-auth.service';
import { ClientContactsService } from '../client-contacts/client-contacts.service';
import { VoiceoverService } from '../voiceover/voiceover.service';
import { ClientCampaignsService } from '../client-campaigns/client-campaigns.service';
import { CallsService } from '../calls/calls.service';
import { TelegramWebAppLoginDto } from '../common/telegram-webapp-login.dto';

/**
 * Один запрос при открытии Telegram Mini App: логинит по initData и сразу
 * возвращает всё начальное состояние (контакты, озвучки, кампании, лог
 * звонков) одним ответом — вместо 5 последовательных round-trip'ов после
 * авторизации. Стандартный паттерн для TMA, где каждый лишний round-trip
 * заметен на старте приложения внутри Telegram WebView.
 */
@Controller('api/client-bootstrap')
export class ClientBootstrapController {
  constructor(
    private clientAuth: ClientAuthService,
    private contacts: ClientContactsService,
    private voiceover: VoiceoverService,
    private campaigns: ClientCampaignsService,
    private calls: CallsService,
  ) {}

  @Post()
  async bootstrap(@Body() dto: TelegramWebAppLoginDto) {
    const auth = await this.clientAuth.loginWithTelegramWebApp(dto.initData);
    const ownerId = auth.user.id;

    const [contactsList, voiceovers, campaignsList, callLogs] = await Promise.all([
      this.contacts.list(ownerId),
      this.voiceover.listVoiceoversForOwner(ownerId),
      this.campaigns.listForOwner(ownerId),
      this.calls.listCallLogsForOwner(ownerId),
    ]);

    return {
      accessToken: auth.accessToken,
      user: auth.user,
      contacts: contactsList,
      voiceovers,
      campaigns: campaignsList,
      callLogs,
    };
  }
}
