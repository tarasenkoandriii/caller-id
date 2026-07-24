import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminsService {
  constructor(private config: ConfigService) {}

  /**
   * Список админов сейчас — email из ADMIN_EMAIL (вход по паролю), весь
   * ALLOWED_GMAIL_EMAILS (вход через Google) и весь ALLOWED_TELEGRAM_IDS
   * (вход через Telegram). Права на включение/отключение конкретного админа
   * пока не реализованы — все считаются включёнными, потому что доступ и
   * так контролируется этими env-переменными.
   */
  list() {
    const admins = new Map<string, { identifier: string; provider: string; enabled: boolean }>();

    const passwordAdmin = this.config.get<string>('ADMIN_EMAIL');
    if (passwordAdmin) {
      const identifier = passwordAdmin.toLowerCase();
      admins.set(identifier, { identifier, provider: 'password', enabled: true });
    }

    const googleAdmins = (this.config.get<string>('ALLOWED_GMAIL_EMAILS') || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    googleAdmins.forEach((identifier) =>
      admins.set(identifier, { identifier, provider: 'google', enabled: true }),
    );

    const telegramAdmins = (this.config.get<string>('ALLOWED_TELEGRAM_IDS') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    telegramAdmins.forEach((id) => {
      const identifier = `telegram:${id}`;
      admins.set(identifier, { identifier, provider: 'telegram', enabled: true });
    });

    return [...admins.values()];
  }
}
