import { useEffect, useState } from 'react';
import { api } from '../api';

type Voice = { voiceId: string; name: string; previewUrl: string | null; accent: string | null };

export default function CreateVoiceoverForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getVoices()
      .then((list: Voice[]) => {
        setVoices(list);
        if (list.length > 0) setVoiceId(list[0].voiceId);
      })
      .catch((err) => setVoicesError(err.message || 'Не удалось загрузить голоса'));
  }, []);

  async function handleGenerate() {
    if (!text.trim() || !voiceId) return;
    setGenerating(true);
    setError(null);
    try {
      const voiceName = voices?.find((v) => v.voiceId === voiceId)?.name;
      await api.createVoiceover(text.trim(), voiceId, voiceName);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать озвучку');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-panel border border-accent/30 rounded-2xl p-5 mb-6 flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Текст для озвучки…"
        className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent resize-none"
      />

      <div className="flex items-center gap-2">
        <select
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          disabled={!voices?.length}
          className="flex-1 bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent"
        >
          {!voices && <option>Загружаем голоса…</option>}
          {voices?.map((v) => (
            <option key={v.voiceId} value={v.voiceId}>
              {v.name}
              {v.accent ? ` (${v.accent})` : ''}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={!text.trim() || !voiceId || generating}
          className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {generating ? 'Озвучиваем…' : 'Озвучить'}
        </button>

        <button
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-white transition-colors shrink-0 px-2"
        >
          Отмена
        </button>
      </div>

      {voicesError && <p className="text-xs text-danger">{voicesError}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
