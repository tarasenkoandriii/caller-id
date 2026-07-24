import { useEffect, useState } from 'react';
import { api } from '../api';

export default function VpnToggle() {
  const [state, setState] = useState<{ enabled: boolean; available: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTelnyxVpnState()
      .then(setState)
      .catch(() => setState({ enabled: false, available: false }));
  }, []);

  async function handleChange() {
    if (!state) return;
    const next = !state.enabled;
    setSaving(true);
    setError(null);
    try {
      await api.setTelnyxVpnEnabled(next);
      setState({ ...state, enabled: next });
    } catch (err: any) {
      setError(err.message || 'Не удалось изменить настройку');
    } finally {
      setSaving(false);
    }
  }

  if (!state) {
    return <div className="h-10 w-64 bg-panel border border-line rounded-xl animate-pulse" />;
  }

  const disabled = !state.available || saving;

  return (
    <div className="bg-panel border border-line rounded-2xl px-4 py-3 flex flex-col gap-1.5">
      <label
        className={`flex items-center gap-2.5 text-sm select-none ${
          disabled ? 'text-neutral-500 cursor-not-allowed' : 'text-white cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={handleChange}
          disabled={disabled}
          className="w-4 h-4 accent-[#3DDC97] disabled:opacity-40"
        />
        Использовать VPN для запросов к Telnyx
      </label>

      {!state.available && (
        <p className="text-xs text-neutral-500">
          Не настроен прокси — задайте TELNYX_PROXY_URL, WEBSHARE_PROXY_USERNAME/PASSWORD
          или HTTPS_PROXY в .env, чтобы включить эту опцию
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
