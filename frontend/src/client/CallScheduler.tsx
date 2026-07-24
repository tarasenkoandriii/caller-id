import { useCallback, useEffect, useState } from 'react';
import { clientApi } from './clientApi';
import { getTelegramMainButton, hapticFeedback, isInTelegramMiniApp } from './telegramWebApp';

type Mode = 'now' | 'once' | 'interval';

export default function CallScheduler({
  voiceoverId,
  contactsCount,
  onScheduled,
}: {
  voiceoverId: string | null;
  contactsCount: number;
  onScheduled: () => void;
}) {
  const isMiniApp = isInTelegramMiniApp();
  const [mode, setMode] = useState<Mode>('now');
  const [time, setTime] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit =
    !!voiceoverId &&
    contactsCount > 0 &&
    (mode === 'now' || (mode === 'once' && time) || (mode === 'interval' && Number(intervalMinutes) > 0));

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !voiceoverId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      let scheduleAt: string | undefined;
      if (mode === 'once') {
        const [hours, minutes] = time.split(':').map(Number);
        const dt = new Date();
        dt.setHours(hours, minutes, 0, 0);
        scheduleAt = dt.toISOString();
      }

      await clientApi.createCampaign({
        voiceoverId,
        scheduleType: mode,
        scheduleAt,
        intervalMinutes: mode === 'interval' ? Number(intervalMinutes) : undefined,
      });

      setSuccess(
        mode === 'now'
          ? 'Обзвон запущен'
          : mode === 'once'
            ? `Обзвон запланирован на ${time}`
            : `Обзвон будет повторяться каждые ${intervalMinutes} мин.`,
      );
      hapticFeedback('success');
      onScheduled();
    } catch (err: any) {
      setError(err.message || 'Не удалось запланировать обзвон');
      hapticFeedback('error');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, voiceoverId, mode, time, intervalMinutes, onScheduled]);

  // Внутри Telegram Mini App дублируем действие через нативную MainButton
  // (закреплена внизу экрана Telegram) вместо обычной HTML-кнопки — более
  // привычный UX для Mini App. Обычная кнопка ниже всё равно остаётся в
  // разметке и работает так же, на случай если MainButton почему-то
  // недоступна (старые версии клиента Telegram).
  useEffect(() => {
    if (!isMiniApp) return;
    const mainButton = getTelegramMainButton();
    if (!mainButton) return;

    mainButton.setText(submitting ? 'Запускаем…' : 'Обзвонить');
    if (canSubmit && !submitting) {
      mainButton.enable();
    } else {
      mainButton.disable();
    }
    mainButton.show();
    mainButton.onClick(handleSubmit);

    return () => {
      mainButton.offClick(handleSubmit);
    };
  }, [isMiniApp, canSubmit, submitting, handleSubmit]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3">Обзвон</h2>

      <div className="flex flex-col gap-2 mb-4">
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input
            type="radio"
            checked={mode === 'now'}
            onChange={() => setMode('now')}
            className="accent-[#3DDC97]"
          />
          Сейчас
        </label>

        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input
            type="radio"
            checked={mode === 'once'}
            onChange={() => setMode('once')}
            className="accent-[#3DDC97]"
          />
          Сегодня в
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onFocus={() => setMode('once')}
            className="bg-ink border border-line rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input
            type="radio"
            checked={mode === 'interval'}
            onChange={() => setMode('interval')}
            className="accent-[#3DDC97]"
          />
          Каждые
          <input
            type="number"
            min={1}
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(e.target.value)}
            onFocus={() => setMode('interval')}
            className="w-16 bg-ink border border-line rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-accent font-mono-num"
          />
          минут
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {submitting ? 'Запускаем…' : 'Обзвонить'}
      </button>

      {!voiceoverId && (
        <p className="text-xs text-neutral-500 mt-2">Сначала сгенерируйте озвучку</p>
      )}
      {voiceoverId && contactsCount === 0 && (
        <p className="text-xs text-neutral-500 mt-2">Список номеров пуст</p>
      )}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      {success && <p className="text-xs text-accent mt-2">{success}</p>}
    </div>
  );
}
