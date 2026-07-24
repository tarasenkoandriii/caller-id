import { useEffect, useRef } from 'react';

export type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

let widgetCounter = 0;

/**
 * Обёртка над Telegram Login Widget (https://core.telegram.org/widgets/login).
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

  useEffect(() => {
    if (!BOT_USERNAME || !containerRef.current) return;

    widgetCounter += 1;
    const callbackName = `onTelegramAuth_${widgetCounter}`;
    (window as any)[callbackName] = (data: TelegramAuthData) => onAuth(data);

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, [onAuth]);

  if (!BOT_USERNAME) {
    return (
      <p className="text-xs text-neutral-500">
        Вход через Telegram не настроен (VITE_TELEGRAM_BOT_USERNAME пуст)
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
