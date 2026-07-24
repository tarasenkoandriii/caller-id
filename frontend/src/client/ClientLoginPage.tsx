import { useState } from 'react';
import ClientGoogleLoginButton from './ClientGoogleLoginButton';
import TelegramLoginButton, { TelegramAuthData } from '../components/TelegramLoginButton';
import { clientApi, saveClientToken } from './clientApi';

export default function ClientLoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function handleTelegramAuth(data: TelegramAuthData) {
    setError(null);
    try {
      const { accessToken } = await clientApi.loginWithTelegram(data);
      saveClientToken(accessToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Не удалось войти через Telegram');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm bg-panel border border-line rounded-2xl p-8 text-center">
        <h1 className="text-lg font-semibold text-white mb-1">Caller ID</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Войдите, чтобы настроить обзвон
        </p>

        <div className="flex flex-col items-center gap-3">
          <ClientGoogleLoginButton onSuccess={onSuccess} onError={setError} />
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>

        {error && <p className="text-danger text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}
