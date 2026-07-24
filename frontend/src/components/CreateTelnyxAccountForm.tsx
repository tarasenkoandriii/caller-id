import { useState } from 'react';
import { api } from '../api';

export default function CreateTelnyxAccountForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!label.trim() || !apiKey.trim() || !connectionId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTelnyxAccount(label.trim(), apiKey.trim(), connectionId.trim());
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Не удалось добавить аккаунт');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-panel border border-accent/30 rounded-2xl p-5 mb-6 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Название</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Основной"
            className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="KEY_xxxxxxxxxxxxxxxx"
            className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent font-mono-num"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Connection ID</label>
          <input
            type="text"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            placeholder="1234567890"
            className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent font-mono-num"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-white transition-colors px-2"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!label.trim() || !apiKey.trim() || !connectionId.trim() || saving}
          className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Сохраняем…' : 'Добавить аккаунт'}
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
