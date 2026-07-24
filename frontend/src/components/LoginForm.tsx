import { useState } from 'react';
import { api, saveToken } from '../api';
import GoogleLoginButton from './GoogleLoginButton';
import TelegramLoginButton, { TelegramAuthData } from './TelegramLoginButton';

export default function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.login(email, password);
      saveToken(accessToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  async function handleTelegramAuth(data: TelegramAuthData) {
    setError(null);
    try {
      const { accessToken } = await api.loginWithTelegram(data);
      saveToken(accessToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Не удалось войти через Telegram');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border border-line rounded-2xl p-8"
      >
        <h1 className="text-lg font-semibold text-white mb-1">Caller ID</h1>
        <p className="text-sm text-neutral-400 mb-6">Войдите, чтобы управлять номерами</p>

        <GoogleLoginButton onSuccess={onSuccess} onError={setError} />

        <div className="my-3 flex justify-center">
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-line flex-1" />
          <span className="text-xs text-neutral-500">или email</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <label className="block text-xs text-neutral-400 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent"
          placeholder="admin@example.com"
        />

        <label className="block text-xs text-neutral-400 mb-1">Пароль</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-danger text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-ink font-medium rounded-lg py-2 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
