import { Body, Controller, Get, Post } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientGoogleLoginDto } from './client-google-login.dto';
import { TelegramAuthDto } from '../common/telegram-auth.dto';
import { TelegramWebAppLoginDto } from '../common/telegram-webapp-login.dto';

@Controller('api/client-auth')
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  /**
   * Публичный эндпоинт (без гварда) — фронтенд (и админка, и клиентская
   * страница) дёргает его перед отрисовкой Telegram Login Widget/Mini App
   * кнопки, чтобы не хранить username бота отдельной VITE_*-переменной.
   */
  @Get('telegram-config')
  async getTelegramConfig() {
    const botUsername = await this.clientAuthService.getTelegramBotUsername();
    return { botUsername };
  }

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
