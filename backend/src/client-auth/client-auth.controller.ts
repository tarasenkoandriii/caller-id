import { Body, Controller, Post } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientGoogleLoginDto } from './client-google-login.dto';
import { TelegramAuthDto } from '../common/telegram-auth.dto';
import { TelegramWebAppLoginDto } from '../common/telegram-webapp-login.dto';

@Controller('client-auth')
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  @Post('google')
  loginWithGoogle(@Body() dto: ClientGoogleLoginDto) {
    return this.clientAuthService.loginWithGoogle(dto.idToken);
  }

  @Post('telegram')
  loginWithTelegram(@Body() dto: TelegramAuthDto) {
    return this.clientAuthService.loginWithTelegram(dto);
  }

  @Post('telegram-webapp')
  loginWithTelegramWebApp(@Body() dto: TelegramWebAppLoginDto) {
    return this.clientAuthService.loginWithTelegramWebApp(dto.initData);
  }
}
