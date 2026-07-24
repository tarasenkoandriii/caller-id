import { useEffect, useRef, useState } from 'react';
import { clientApi } from './clientApi';

type Voice = { voiceId: string; name: string; accent: string | null };

export default function VoiceoverPanel({
  onVoiceoverReady,
}: {
  onVoiceoverReady: (voiceover: { id: string; audioUrl: string }) => void;
}) {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    clientApi
      .getVoices()
      .then((list: Voice[]) => {
        setVoices(list);
        if (list.length > 0) setVoiceId(list[0].voiceId);
      })
      .catch((err) => setError(err.message || 'Не удалось загрузить голоса'));
  }, []);

  async function handleGenerate() {
    if (!text.trim() || !voiceId) return;
    setGenerating(true);
    setError(null);
    try {
      const voiceName = voices?.find((v) => v.voiceId === voiceId)?.name;
      const voiceover = await clientApi.createVoiceover(text.trim(), voiceId, voiceName);
      setAudioUrl(voiceover.audioUrl);
      onVoiceoverReady({ id: voiceover.id, audioUrl: voiceover.audioUrl });
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать озвучку');
    } finally {
      setGenerating(false);
    }
  }

  function handleListen() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3">Текст и озвучка</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Текст сообщения, которое услышит собеседник…"
        className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent resize-none mb-3"
      />

      <select
        value={voiceId}
        onChange={(e) => setVoiceId(e.target.value)}
        disabled={!voices?.length}
        className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent mb-3"
      >
        {!voices && <option>Загружаем голоса…</option>}
        {voices?.map((v) => (
          <option key={v.voiceId} value={v.voiceId}>
            {v.name}
            {v.accent ? ` (${v.accent})` : ''}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || !voiceId || generating}
          className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {generating ? 'Озвучиваем…' : 'Озвучить'}
        </button>
        <button
          onClick={handleListen}
          disabled={!audioUrl}
          className="bg-panel border border-line text-white text-sm font-medium rounded-lg px-4 py-2 hover:border-accent disabled:opacity-40 transition-colors"
        >
          {playing ? '⏸ Пауза' : '▶ Прослушать'}
        </button>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          className="hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}

      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}
