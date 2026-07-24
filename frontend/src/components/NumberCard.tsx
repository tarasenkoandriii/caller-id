type PoolNumber = {
  id: string;
  phoneNumber: string;
  status: string;
  provider?: string;
  countryCode: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-accent/10 text-accent',
  pending: 'bg-warn/10 text-warn',
  failed: 'bg-danger/10 text-danger',
  released: 'bg-neutral-500/10 text-neutral-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  pending: 'Ожидание',
  failed: 'Ошибка',
  released: 'Освобождён',
};

const PROVIDER_LABELS: Record<string, string> = {
  telnyx: 'Telnyx',
  didww: 'DIDWW',
  didlogic: 'DIDLogic',
};

export default function NumberCard({ number }: { number: PoolNumber }) {
  const isActive = number.status === 'active';
  const statusClass = STATUS_STYLES[number.status] || STATUS_STYLES.pending;
  const statusLabel = STATUS_LABELS[number.status] || number.status;
  const isPlaceholder = number.phoneNumber?.startsWith('pending-');
  const providerLabel = number.provider ? PROVIDER_LABELS[number.provider] || number.provider : null;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs text-neutral-500">
          {number.countryCode}
          {providerLabel && ` · ${providerLabel}`}
        </span>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusClass}`}
        >
          {number.status === 'pending' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
          )}
          {isActive && <span className="leading-none">✓</span>}
          {statusLabel}
        </span>
      </div>
      <p className="text-lg font-semibold text-white font-mono-num">
        {isPlaceholder ? 'Номер уточняется…' : number.phoneNumber}
      </p>
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-accent">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent/10 shrink-0">
            ✓
          </span>
          <span>Номер получил статус active</span>
        </div>
      )}
      <p className="text-xs text-neutral-500">
        {new Date(number.createdAt).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
