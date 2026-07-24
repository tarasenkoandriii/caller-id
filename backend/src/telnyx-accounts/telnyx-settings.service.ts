import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelnyxClient } from '../telnyx/telnyx.client';
import { isTelnyxProxyConfigured } from '../telnyx/telnyx-proxy.util';

const SETTINGS_ID = 'singleton';

@Injectable()
export class TelnyxSettingsService {
  constructor(
    private prisma: PrismaService,
    private client: TelnyxClient,
  ) {}

  /**
   * Состояние чекбокса "Использовать VPN". `available` — есть ли вообще в
   * env данные для прокси (TELNYX_PROXY_URL / WEBSHARE_PROXY_* /
   * HTTPS_PROXY). Если их нет, `enabled` принудительно возвращается как
   * false и фронтенд должен задизейблить чекбокс.
   */
  async getState() {
    const available = isTelnyxProxyConfigured();
    const settings = await this.prisma.telnyxSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const enabled = available && !!settings?.useVpn;
    return { enabled, available };
  }

  async setEnabled(enabled: boolean) {
    if (enabled && !isTelnyxProxyConfigured()) {
      throw new BadRequestException(
        'VPN/прокси не настроен — задайте TELNYX_PROXY_URL, WEBSHARE_PROXY_USERNAME/PASSWORD или HTTPS_PROXY в .env',
      );
    }

    await this.prisma.telnyxSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, useVpn: enabled },
      update: { useVpn: enabled },
    });

    await this.client.rebuildDispatcher(enabled);

    return { enabled };
  }
}
