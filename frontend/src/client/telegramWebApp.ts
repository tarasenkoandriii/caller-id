declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        ready: () => void;
        expand: () => void;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        MainButton: {
          text: string;
          color?: string;
          textColor?: string;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        HapticFeedback?: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
      };
    };
  }
}

/** Мы реально внутри Telegram Mini App (не просто браузер), только тогда initData непустой */
export function isInTelegramMiniApp(): boolean {
  return !!window.Telegram?.WebApp?.initData;
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

/** ready() убирает нативный сплэш Telegram, expand() растягивает WebView на весь экран */
export function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
}

export function getTelegramMainButton() {
  return window.Telegram?.WebApp?.MainButton;
}

export function hapticFeedback(type: 'success' | 'error' | 'warning' = 'success') {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}
