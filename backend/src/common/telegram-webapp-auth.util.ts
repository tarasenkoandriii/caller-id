import * as crypto from 'crypto';

/**
 * Проверка initData из Telegram Mini App (window.Telegram.WebApp.initData).
 *
 * ВАЖНО: это ДРУГОЙ алгоритм подписи, чем у Telegram Login Widget
 * (см. telegram-auth.util.ts) — там ключ SHA256(bot_token), здесь ключ —
 * HMAC-SHA256("WebAppData", bot_token). Перепутать их — частая ошибка,
 * проверка тихо провалится с "невалидные данные" при использовании не того
 * алгоритма не с тем источником данных.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramWebAppVerifyResult {
  valid: boolean;
  user?: TelegramWebAppUser;
  authDate?: number;
}

export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): TelegramWebAppVerifyResult {
  if (!initData || !botToken) return { valid: false };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { valid: false };
  params.delete('hash');

  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return { valid: false };

  const authDate = Number(params.get('auth_date'));
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSeconds > maxAgeSeconds || ageSeconds < -60) return { valid: false };

  const userRaw = params.get('user');
  let user: TelegramWebAppUser | undefined;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      return { valid: false };
    }
  }
  if (!user?.id) return { valid: false };

  return { valid: true, user, authDate };
}
