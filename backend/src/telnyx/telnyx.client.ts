import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTelnyxProxyUrl } from './telnyx-proxy.util';

const SETTINGS_ID = 'singleton';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Клиент, непосредственно работающий с Telnyx API. Поддерживает
 * мультиаккаунт: каждый метод принимает необязательный `apiKey` — если не
 * передан, используется значение из TELNYX_API_KEY (env) как единственный
 * "аккаунт по умолчанию" для проектов, ещё не мигрировавших на таблицу
 * TelnyxAccount (см. PoolService и TelnyxAccountsService).
 *
 * Также поддерживает опциональный проксирующий "VPN"-режим (чекбокс во
 * вкладке "Telnyx"): при включении ВСЕ запросы этого клиента идут через
 * undici ProxyAgent — тот же паттерн, что уже используется в проекте
 * cargo-tracker для CargoAI (см. telnyx-proxy.util.ts).
 */
@Injectable()
export class TelnyxClient implements OnModuleInit {
  private readonly baseUrl = 'https://api.telnyx.com/v2';
  private readonly logger = new Logger(TelnyxClient.name);
  private dispatcher: unknown = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // При холодном старте синхронизируем диспетчер с сохранённым в БД
    // состоянием чекбокса (если проект уже когда-то его включал).
    try {
      const settings = await this.prisma.telnyxSettings.findUnique({
        where: { id: SETTINGS_ID },
      });
      if (settings?.useVpn) {
        await this.rebuildDispatcher(true);
      }
    } catch {
      // Таблица могла быть ещё не смигрирована — не роняем старт приложения.
    }
  }

  /**
   * Пересобирает (или сбрасывает) прокси-диспетчер. Вызывается сразу при
   * включении/выключении чекбокса из TelnyxSettingsService, а также один
   * раз при старте процесса, если VPN был включён ранее.
   */
  async rebuildDispatcher(useVpn: boolean): Promise<void> {
    if (!useVpn) {
      this.dispatcher = null;
      return;
    }
    const proxyUrl = resolveTelnyxProxyUrl();
    if (!proxyUrl) {
      this.dispatcher = null;
      return;
    }
    try {
      const { ProxyAgent } = await import('undici');
      this.dispatcher = new ProxyAgent(proxyUrl);
      this.logger.log('Telnyx VPN/proxy dispatcher enabled');
    } catch {
      this.dispatcher = null; // undici недоступен — идём напрямую, не падаем
    }
  }

  private buildOptions(headers: Record<string, string>, extra: RequestInit = {}): RequestInit {
    const opts: RequestInit = { ...extra, headers };
    if (this.dispatcher) {
      (opts as any).dispatcher = this.dispatcher; // undici читает это поле из init
    }
    return opts;
  }

  private headers(apiKey?: string) {
    const key = apiKey || this.config.get<string>('TELNYX_API_KEY');
    return {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }

  private async handle(res: Response) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        body?.errors?.[0]?.detail || body?.errors?.[0]?.title || res.statusText;
      throw new InternalServerErrorException(`Telnyx API: ${message}`);
    }
    return body;
  }

  /** Баланс аккаунта Telnyx */
  async getBalance(apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/balance`,
      this.buildOptions(this.headers(apiKey)),
    );
    return this.handle(res);
  }

  /** Все номера, привязанные к аккаунту (для сверки со своей БД) */
  async listOwnedNumbers(apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/phone_numbers?page[size]=100`,
      this.buildOptions(this.headers(apiKey)),
    );
    return this.handle(res);
  }

  /** Проверка статуса SIP-коннекшена / Call Control Application */
  async getConnectionStatus(connectionId: string, apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/connections/${connectionId}`,
      this.buildOptions(this.headers(apiKey)),
    );
    return this.handle(res);
  }

  /** Поиск доступных номеров под покупку */
  async searchAvailableNumbers(countryCode = 'UA', limit = 5, apiKey?: string) {
    const params = new URLSearchParams({
      'filter[country_code]': countryCode,
      'filter[limit]': String(limit),
      'filter[phone_number_type]': 'local',
    });
    const res = await fetchWithRetry(
      `${this.baseUrl}/available_phone_numbers?${params}`,
      this.buildOptions(this.headers(apiKey)),
    );
    return this.handle(res);
  }

  /** Заказ номера и привязка к SIP connection */
  async orderNumber(phoneNumber: string, connectionId: string, apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/number_orders`,
      this.buildOptions(this.headers(apiKey), {
        method: 'POST',
        body: JSON.stringify({
          phone_numbers: [{ phone_number: phoneNumber }],
          connection_id: connectionId,
        }),
      }),
    );
    return this.handle(res);
  }

  /** Освобождение номера (для очистки failed-заказов) */
  async releaseNumber(telnyxNumberId: string, apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/phone_numbers/${telnyxNumberId}`,
      this.buildOptions(this.headers(apiKey), { method: 'DELETE' }),
    );
    return this.handle(res);
  }

  /** Инициирует исходящий звонок через Call Control API */
  async createCall(params: {
    to: string;
    from: string;
    connectionId: string;
    webhookUrl: string;
    apiKey?: string;
  }) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/calls`,
      this.buildOptions(this.headers(params.apiKey), {
        method: 'POST',
        body: JSON.stringify({
          connection_id: params.connectionId,
          to: params.to,
          from: params.from,
          webhook_url: params.webhookUrl,
          timeout_secs: 30,
        }),
      }),
    );
    return this.handle(res);
  }

  /** Проигрывание публичного mp3 в уже поднятом звонке */
  async playbackStart(callControlId: string, audioUrl: string, apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/calls/${callControlId}/actions/playback_start`,
      this.buildOptions(this.headers(apiKey), {
        method: 'POST',
        body: JSON.stringify({ audio_url: audioUrl, overlay: false }),
      }),
    );
    return this.handle(res);
  }

  /** Принудительное завершение звонка (например, после проигрывания) */
  async hangupCall(callControlId: string, apiKey?: string) {
    const res = await fetchWithRetry(
      `${this.baseUrl}/calls/${callControlId}/actions/hangup`,
      this.buildOptions(this.headers(apiKey), { method: 'POST' }),
    );
    return this.handle(res);
  }
}
