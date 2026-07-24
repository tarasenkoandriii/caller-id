type Status = {
  balance: { amount: string; currency: string; creditLimit: string };
  connection: { id: string; name: string; active: boolean };
};

export default function StatusBar({ status }: { status: Status | null }) {
  if (!status) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-24 bg-panel border border-line rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-xs text-neutral-400 mb-2">Баланс аккаунта</p>
        <p className="text-2xl font-semibold text-white font-mono-num">
          {status.balance.amount} {status.balance.currency}
        </p>
        {status.balance.creditLimit && (
          <p className="text-xs text-neutral-500 mt-1">
            Кредитный лимит: {status.balance.creditLimit}
          </p>
        )}
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-400 mb-2">SIP Connection</p>
          <p className="text-white font-medium">{status.connection.name || '—'}</p>
          <p className="text-xs text-neutral-500 mt-1">{status.connection.id}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${
            status.connection.active
              ? 'bg-accent/10 text-accent'
              : 'bg-danger/10 text-danger'
          }`}
        >
          {status.connection.active ? 'Активен' : 'Неактивен'}
        </span>
      </div>
    </div>
  );
}
