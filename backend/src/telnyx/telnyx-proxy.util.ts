/**
 * Построение URL прокси для Telnyx-запросов — тот же паттерн, что уже
 * используется в проекте cargo-tracker для CargoAI: Webshare-прокси как
 * "VPN" (меняет исходящий IP), с удобными env-переменными вместо ручной
 * сборки URL. Приоритет (первое найденное побеждает):
 *   1) TELNYX_PROXY_URL — готовый URL вида http://user:pass@host:port
 *   2) WEBSHARE_PROXY_USERNAME / _PASSWORD (+ опционально _HOST/_PORT/_COUNTRY/_ROTATE)
 *   3) обычные HTTPS_PROXY / HTTP_PROXY
 */

export function webshareProxyUrl(): string | null {
  const user = process.env.WEBSHARE_PROXY_USERNAME;
  const pass = process.env.WEBSHARE_PROXY_PASSWORD;
  if (!user || !pass) return null;
  const host = process.env.WEBSHARE_PROXY_HOST || 'p.webshare.io';
  const port = process.env.WEBSHARE_PROXY_PORT || '80';
  const country = (process.env.WEBSHARE_PROXY_COUNTRY || '').trim().toLowerCase();
  const rotate = !['0', 'false', 'no', 'off'].includes(
    (process.env.WEBSHARE_PROXY_ROTATE || 'true').trim().toLowerCase(),
  );
  let u = user;
  if (country) u += `-${country}`;
  if (rotate) u += '-rotate';
  return `http://${u}:${pass}@${host}:${port}`;
}

export function resolveTelnyxProxyUrl(): string | null {
  return (
    process.env.TELNYX_PROXY_URL ||
    webshareProxyUrl() ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    null
  );
}

/** Есть ли вообще в env достаточно данных, чтобы включить VPN-опцию */
export function isTelnyxProxyConfigured(): boolean {
  return resolveTelnyxProxyUrl() !== null;
}
