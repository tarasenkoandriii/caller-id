type CallLog = {
  id: string;
  toNumber: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  failureReason: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  initiated: 'Набираем…',
  answered: 'В разговоре',
  completed: 'Завершён',
  failed: 'Ошибка',
};

const STATUS_STYLES: Record<string, string> = {
  initiated: 'bg-warn/10 text-warn',
  answered: 'bg-accent/10 text-accent',
  completed: 'bg-neutral-500/10 text-neutral-300',
  failed: 'bg-danger/10 text-danger',
};

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallLogTable({ logs }: { logs: CallLog[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3">Лог звонков</h2>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_90px_110px] px-4 py-2.5 text-xs text-neutral-500 border-b border-line">
          <span>Номер</span>
          <span>Начало</span>
          <span>Длительность</span>
          <span>Статус</span>
        </div>

        {logs.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            Звонков пока не было
          </div>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="grid grid-cols-[1fr_100px_90px_110px] items-center px-4 py-2.5 border-b border-line last:border-0"
          >
            <span className="text-sm text-white font-mono-num">{log.toNumber}</span>
            <span className="text-xs text-neutral-400 font-mono-num">
              {log.startedAt
                ? new Date(log.startedAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
            <span className="text-xs text-neutral-400 font-mono-num">
              {formatDuration(log.startedAt, log.endedAt)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full w-fit ${
                STATUS_STYLES[log.status] || STATUS_STYLES.initiated
              }`}
            >
              {STATUS_LABELS[log.status] || log.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
