import * as crypto from 'crypto';

/**
 * Данные, которые присылает Telegram Login Widget в колбэк onauth.
 * https://core.telegram.org/widgets/login
 */
export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Проверяет подпись данных от Telegram Login Widget: HMAC-SHA256 от
 * отсортированной строки "key=value" (все поля, кроме hash), где ключ —
 * SHA256 от токена бота. Плюс проверка свежести auth_date, чтобы старые
 * перехваченные данные нельзя было переиграть повторно.
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string | undefined,
  maxAgeSeconds = 86400,
): boolean {
  if (!botToken) return false;

  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .filter((key) => (rest as Record<string, unknown>)[key] !== undefined)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, unknown>)[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  if (computedHash !== hash) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - data.auth_date;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -60) return false; // -60: небольшой запас на рассинхрон часов

  return true;
}

export function telegramOwnerId(telegramUserId: number): string {
  return `telegram:${telegramUserId}`;
}

export function telegramDisplayName(data: TelegramAuthData): string {
  return [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || `Telegram #${data.id}`;
}
