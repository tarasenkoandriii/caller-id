import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { normalizeUaPhone } from '../uaPhone';

type Voiceover = {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string | null;
  audioUrl: string;
  createdAt: string;
};

type CallLog = {
  id: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  failureReason: string | null;
};

const CALL_STATUS_LABELS: Record<string, string> = {
  initiated: 'Набираем…',
  answered: 'Ответили, играем озвучку',
  completed: 'Завершён',
  failed: 'Ошибка звонка',
};

const CALL_STATUS_STYLES: Record<string, string> = {
  initiated: 'text-neutral-400',
  answered: 'text-accent',
  completed: 'text-neutral-300',
  failed: 'text-danger',
};

/** Длительность разговора — от ответа (startedAt) до завершения (endedAt), либо "сейчас" пока звонок ещё идёт */
function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '';
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceoverRow({ voiceover }: { voiceover: Voiceover }) {
  const [phone, setPhone] = useState('');
  const [calling, setCalling] = useState(false);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [callLog, setCallLog] = useState<CallLog | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);

  const normalized = normalizeUaPhone(phone);
  const showPhoneError = phone.length > 0 && !normalized;

  async function handleCall() {
    if (!normalized) return;
    setCalling(true);
    setCallError(null);
    setCallLog(null);
    try {
      const log = await api.testCall(normalized, voiceover.id);
      setCallLogId(log.id);
      setCallLog(log);
    } catch (err: any) {
      setCallError(err.message || 'Не удалось начать звонок');
      setCallLogId(null);
    } finally {
      setCalling(false);
    }
  }

  // Пока звонок не в финальном статусе — подтягиваем его лог каждые 3 сек,
  // чтобы статус и длительность обновлялись сами, без перезагрузки страницы.
  useEffect(() => {
    if (!callLogId) return;
    const isFinal = callLog?.status === 'completed' || callLog?.status === 'failed';
    if (isFinal) return;

    const poll = async () => {
      try {
        const logs = await api.getCallLogs();
        const match = logs.find((l: CallLog) => l.id === callLogId);
        if (match) setCallLog(match);
      } catch {
        // сетевой сбой одного тика — не страшно, попробуем на следующем
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [callLogId, callLog?.status]);

  // Локальный тик раз в секунду, чтобы длительность росла плавно между
  // опросами сервера, пока звонок ещё в процессе (answered, не completed).
  useEffect(() => {
    if (callLog?.status !== 'answered') return;
    const id = window.setInterval(() => setCallLog((c) => (c ? { ...c } : c)), 1000);
    tickRef.current = id;
    return () => window.clearInterval(id);
  }, [callLog?.status]);

  const duration = callLog ? formatDuration(callLog.startedAt, callLog.endedAt) : '';

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-white leading-relaxed line-clamp-3">{voiceover.text}</p>
        <span className="text-xs text-neutral-500 shrink-0 whitespace-nowrap">
          {voiceover.voiceName || voiceover.voiceId}
        </span>
      </div>

      <audio controls preload="none" src={voiceover.audioUrl} className="w-full h-9" />

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380XXXXXXXXX"
            className={`w-full bg-ink border rounded-lg px-3 py-2 text-white text-sm outline-none font-mono-num ${
              showPhoneError ? 'border-danger' : 'border-line focus:border-accent'
            }`}
          />
          {showPhoneError && (
            <p className="text-xs text-danger mt-1">Формат: +380XXXXXXXXX</p>
          )}
        </div>
        <button
          onClick={handleCall}
          disabled={!normalized || calling}
          className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {calling ? '…' : 'Звонок'}
        </button>
      </div>

      {callLog && (
        <p className={`text-xs ${CALL_STATUS_STYLES[callLog.status] || 'text-neutral-400'}`}>
          {CALL_STATUS_LABELS[callLog.status] || callLog.status}
          {duration && ` — ${duration}`}
          {callLog.status === 'failed' && callLog.failureReason && `: ${callLog.failureReason}`}
        </p>
      )}
      {callError && <p className="text-xs text-danger">{callError}</p>}
    </div>
  );
}
