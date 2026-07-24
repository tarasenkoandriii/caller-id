import { useState } from 'react';
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

const CALL_STATUS_LABELS: Record<string, string> = {
  initiated: 'Набираем…',
  answered: 'Ответили, играем озвучку',
  completed: 'Завершён',
  failed: 'Ошибка звонка',
};

export default function VoiceoverRow({ voiceover }: { voiceover: Voiceover }) {
  const [phone, setPhone] = useState('');
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const normalized = normalizeUaPhone(phone);
  const showPhoneError = phone.length > 0 && !normalized;

  async function handleCall() {
    if (!normalized) return;
    setCalling(true);
    setCallError(null);
    setCallStatus('initiated');
    try {
      const log = await api.testCall(normalized, voiceover.id);
      setCallStatus(log.status);
    } catch (err: any) {
      setCallError(err.message || 'Не удалось начать звонок');
      setCallStatus(null);
    } finally {
      setCalling(false);
    }
  }

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

      {callStatus && (
        <p className="text-xs text-neutral-400">
          {CALL_STATUS_LABELS[callStatus] || callStatus}
        </p>
      )}
      {callError && <p className="text-xs text-danger">{callError}</p>}
    </div>
  );
}
