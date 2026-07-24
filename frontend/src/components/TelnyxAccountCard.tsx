type TelnyxAccountStats = {
  id: string;
  label: string;
  apiKeyMasked: string;
  connectionId: string;
  enabled: boolean;
  isActive: boolean;
  numbersCount: number;
  balance: { amount: string; currency: string } | null;
  connectionActive: boolean | null;
  error: string | null;
};

export default function TelnyxAccountCard({
  account,
  onToggle,
  onDelete,
  onSetActive,
  busy,
}: {
  account: TelnyxAccountStats;
  onToggle: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  busy: boolean;
}) {
  return (
    <div
      className={`bg-panel border rounded-2xl p-5 flex flex-col gap-3 ${
        account.isActive ? 'border-accent' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{account.label}</p>
            {account.isActive && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent/10 text-accent text-xs shrink-0">
                ✓
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 font-mono-num">{account.apiKeyMasked}</p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            account.enabled ? 'bg-accent/10 text-accent' : 'bg-neutral-500/10 text-neutral-400'
          }`}
        >
          {account.enabled ? 'Включён' : 'Отключён'}
        </span>
      </div>

      {account.error ? (
        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {account.error}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Баланс</p>
            <p className="text-sm text-white font-mono-num">
              {account.balance ? `${account.balance.amount} ${account.balance.currency}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Call Control App</p>
            <p
              className={`text-sm font-medium ${
                account.connectionActive ? 'text-accent' : 'text-danger'
              }`}
            >
              {account.connectionActive ? 'Активен' : 'Неактивен'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-line">
        <span className="text-xs text-neutral-500">
          {account.numbersCount} номер(ов) в пуле
        </span>
        <div className="flex gap-3">
          {!account.isActive && (
            <button
              onClick={onSetActive}
              disabled={busy || !account.enabled}
              className="text-xs text-accent hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Сделать активным
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={busy}
            className="text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-40"
          >
            {account.enabled ? 'Отключить' : 'Включить'}
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-xs text-danger hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
