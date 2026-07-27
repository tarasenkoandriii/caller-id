import { useEffect, useRef, useState } from 'react';

export type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

// Единый деплой — тот же принцип, что и в api.ts/clientApi.ts: пустой
// VITE_API_URL означает "тот же домен", относительным путём.
const API_BASE = import.meta.env.VITE_API_URL || '';

let widgetCounter = 0;

/**
 * Обёртка над Telegram Login Widget (https://core.telegram.org/widgets/login).
 * Username бота НЕ хранится отдельной VITE_*-переменной — компонент сам
 * запрашивает его у бэкенда (GET /api/client-auth/telegram-config), который
 * получает его через Telegram Bot API (getMe) по уже настроенному
 * TELEGRAM_BOT_TOKEN. Единственный источник правды — один токен в
 * backend/.env, без дублирования username во фронтенд-конфиге.
 *
 * Виджет требует глобальную callback-функцию по имени в data-onauth — на
 * случай нескольких одновременных монтирований (или повторных при роутинге
 * в SPA) имя каждый раз уникальное, и функция аккуратно снимается при
 * размонтировании.
 */
export default function TelegramLoginButton({
  onAuth,
}: {
  onAuth: (data: TelegramAuthData) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [botUsername, setBotUsername] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/client-auth/telegram-config`)
      .then((res) => res.json())
      .then((data) => setBotUsername(data.botUsername || null))
      .catch(() => setBotUsername(null));
  }, []);

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    widgetCounter += 1;
    const callbackName = `onTelegramAuth_${widgetCounter}`;
    (window as any)[callbackName] = (data: TelegramAuthData) => onAuth(data);

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, [botUsername, onAuth]);

  if (botUsername === undefined) {
    return null; // ждём ответа от бэкенда, ничего не мигаем
  }

  if (!botUsername) {
    return (
      <p className="text-xs text-neutral-500">
        Вход через Telegram не настроен (TELEGRAM_BOT_TOKEN пуст или бот недоступен)
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
