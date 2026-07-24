import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import TelnyxAccountCard from '../components/TelnyxAccountCard';
import CreateTelnyxAccountForm from '../components/CreateTelnyxAccountForm';
import VpnToggle from '../components/VpnToggle';

export default function TelnyxPage() {
  const [accounts, setAccounts] = useState<any[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts(await api.getTelnyxAccounts());
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(id: string, enabled: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await api.setTelnyxAccountEnabled(id, !enabled);
      await load();
    } catch (err: any) {
      setError(err.message || 'Не удалось изменить статус аккаунта');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.deleteTelnyxAccount(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить аккаунт');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetActive(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.setActiveTelnyxAccount(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Не удалось сделать аккаунт активным');
    } finally {
      setBusyId(null);
    }
  }

  // Итоговая статистика по всем аккаунтам — суммарный баланс (в разрезе валют,
  // на случай если аккаунты когда-то будут в разных валютах), общее число
  // номеров и сколько Call Control Application сейчас реально активны.
  const totals = (accounts || []).reduce(
    (acc, a) => {
      if (a.balance) {
        const key = a.balance.currency || 'USD';
        acc.balanceByCurrency[key] = (acc.balanceByCurrency[key] || 0) + parseFloat(a.balance.amount || '0');
      }
      acc.numbers += a.numbersCount || 0;
      if (a.connectionActive) acc.activeConnections += 1;
      return acc;
    },
    { balanceByCurrency: {} as Record<string, number>, numbers: 0, activeConnections: 0 },
  );
  const balanceEntries = Object.entries(totals.balanceByCurrency);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Telnyx — аккаунты</h2>
          <p className="text-sm text-neutral-500">
            Мультиаккаунт: баланс, статус подключения и номера по каждому аккаунту
          </p>
        </div>
        {!showCreate && (
          <div className="flex items-center gap-3 shrink-0">
            <VpnToggle />
            <button
              onClick={() => setShowCreate(true)}
              className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
            >
              + Добавить аккаунт
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-xs text-neutral-400 mb-2">Суммарный баланс</p>
          <p className="text-2xl font-semibold text-white font-mono-num">
            {balanceEntries.length === 0
              ? '—'
              : balanceEntries.map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`).join(' + ')}
          </p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-xs text-neutral-400 mb-2">Номеров в пуле</p>
          <p className="text-2xl font-semibold text-white font-mono-num">{totals.numbers}</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <p className="text-xs text-neutral-400 mb-2">Активных подключений</p>
          <p className="text-2xl font-semibold text-white font-mono-num">
            {totals.activeConnections} / {accounts?.length ?? 0}
          </p>
        </div>
      </div>

      {showCreate && (
        <CreateTelnyxAccountForm
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {error && (
        <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {accounts === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 bg-panel border border-line rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {accounts?.length === 0 && !showCreate && (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-10 text-center text-sm text-neutral-500">
          Аккаунтов Telnyx пока нет — нажмите "Добавить аккаунт", чтобы подключить первый.
          <br />
          Пока аккаунтов нет, заказ номеров и звонки используют legacy-переменные
          TELNYX_API_KEY / TELNYX_CONNECTION_ID из .env.
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((a) => (
            <TelnyxAccountCard
              key={a.id}
              account={a}
              onToggle={() => handleToggle(a.id, a.enabled)}
              onDelete={() => handleDelete(a.id)}
              onSetActive={() => handleSetActive(a.id)}
              busy={busyId === a.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
