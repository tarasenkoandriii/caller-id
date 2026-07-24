import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  TelegramAuthData,
  telegramDisplayName,
  telegramOwnerId,
  verifyTelegramAuth,
} from '../common/telegram-auth.util';
import { verifyTelegramWebAppInitData } from '../common/telegram-webapp-auth.util';

/**
 * Логин для клиентской страницы "/" — доступны Google и Telegram, оба БЕЗ
 * allowlist-ограничений (в отличие от админского логина, см.
 * auth/auth.service.ts): это самостоятельная регистрация, доступная любому
 * проверенному Google-аккаунту или любому пользователю Telegram. Изоляция
 * данных между клиентами обеспечивается тем, что все клиентские сущности
 * (номера, кампании, логи) хранятся с полем `ownerId` — email из Google-токена
 * либо `telegram:<numeric id>` для входа через Telegram — а не общим списком.
 */
@Injectable()
export class ClientAuthService {
  private googleClient: OAuth2Client;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Невалидный Google-токен');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Google-аккаунт без email');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('Email в Google-аккаунте не подтверждён');
    }

    const token = await this.jwt.signAsync({
      sub: payload.email,
      role: 'client',
      name: payload.name,
      picture: payload.picture,
    });

    return {
      accessToken: token,
      user: { email: payload.email, name: payload.name, picture: payload.picture },
    };
  }

  /**
   * Логин через Telegram Login Widget — без allowlist, любой пользователь
   * Telegram может зайти на клиентскую страницу. Owner-идентификатор —
   * `telegram:<numeric id>`, стабильный и уникальный для аккаунта Telegram.
   */
  async loginWithTelegram(data: TelegramAuthData) {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!verifyTelegramAuth(data, botToken)) {
      throw new UnauthorizedException('Невалидные данные Telegram-логина');
    }

    const ownerId = telegramOwnerId(data.id);
    const name = telegramDisplayName(data);

    const token = await this.jwt.signAsync({
      sub: ownerId,
      role: 'client',
      name,
      picture: data.photo_url,
      provider: 'telegram',
    });

    return {
      accessToken: token,
      user: { id: ownerId, name, picture: data.photo_url },
    };
  }

  /**
   * Логин из Telegram Mini App — проверяет initData (window.Telegram.WebApp.initData),
   * которое Mini App шлёт автоматически при открытии, без клика на виджет.
   * Тот же owner-идентификатор `telegram:<id>`, что и у Login Widget — если
   * человек уже пользовался клиентской страницей через Login Widget в
   * браузере, а потом открыл тот же бот как Mini App, это один и тот же
   * владелец данных (тот же Telegram numeric id).
   */
  async loginWithTelegramWebApp(initData: string) {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const result = verifyTelegramWebAppInitData(initData, botToken);
    if (!result.valid || !result.user) {
      throw new UnauthorizedException('Невалидные данные Telegram Mini App');
    }

    const ownerId = telegramOwnerId(result.user.id);
    const name =
      [result.user.first_name, result.user.last_name].filter(Boolean).join(' ') ||
      result.user.username ||
      `Telegram #${result.user.id}`;

    const token = await this.jwt.signAsync({
      sub: ownerId,
      role: 'client',
      name,
      picture: result.user.photo_url,
      provider: 'telegram-miniapp',
    });

    return {
      accessToken: token,
      user: { id: ownerId, name, picture: result.user.photo_url },
    };
  }
}
