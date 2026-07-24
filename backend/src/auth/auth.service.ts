import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import {
  TelegramAuthData,
  telegramDisplayName,
  telegramOwnerId,
  verifyTelegramAuth,
} from '../common/telegram-auth.util';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async login(email: string, password: string) {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const passwordHash = this.config.get<string>('ADMIN_PASSWORD_HASH');

    if (email !== adminEmail) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isValid = await bcrypt.compare(password, passwordHash || '');
    if (!isValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const token = await this.jwt.signAsync({ sub: email, role: 'admin' });
    return { accessToken: token };
  }

  /**
   * Принимает ID-токен, полученный на фронте через Google Identity Services,
   * проверяет его подпись/аудиторию у Google и сверяет email со списком
   * разрешённых аккаунтов (ALLOWED_GMAIL_EMAILS).
   */
  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
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

    const allowedEmails = (this.config.get<string>('ALLOWED_GMAIL_EMAILS') || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(payload.email.toLowerCase())) {
      throw new UnauthorizedException(
        'Этот Google-аккаунт не имеет доступа к админке',
      );
    }

    const token = await this.jwt.signAsync({
      sub: payload.email,
      role: 'admin',
      name: payload.name,
      picture: payload.picture,
    });

    return {
      accessToken: token,
      user: { email: payload.email, name: payload.name, picture: payload.picture },
    };
  }

  /**
   * Логин в админку через Telegram Login Widget — как и вход по Google,
   * ограничен списком разрешённых аккаунтов, только не по email, а по
   * числовому Telegram ID (у Telegram нет email).
   */
  async loginWithTelegram(data: TelegramAuthData) {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!verifyTelegramAuth(data, botToken)) {
      throw new UnauthorizedException('Невалидные данные Telegram-логина');
    }

    const allowedIds = (this.config.get<string>('ALLOWED_TELEGRAM_IDS') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!allowedIds.includes(String(data.id))) {
      throw new UnauthorizedException('Этот Telegram-аккаунт не имеет доступа к админке');
    }

    const ownerId = telegramOwnerId(data.id);
    const name = telegramDisplayName(data);

    const token = await this.jwt.signAsync({
      sub: ownerId,
      role: 'admin',
      name,
      picture: data.photo_url,
      provider: 'telegram',
    });

    return {
      accessToken: token,
      user: { id: ownerId, name, picture: data.photo_url },
    };
  }
}
