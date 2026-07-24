import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import VoiceoverRow from '../components/VoiceoverRow';
import CreateVoiceoverForm from '../components/CreateVoiceoverForm';

export default function VoiceoverPage() {
  const [voiceovers, setVoiceovers] = useState<any[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      setVoiceovers(await api.getVoiceovers());
    } catch {
      setVoiceovers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Озвучка (ElevenLabs)</h2>
          <p className="text-sm text-neutral-500">
            Сгенерируйте озвучку и сделайте пробный звонок с проигрыванием после ответа
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
          >
            + Добавить озвучку
          </button>
        )}
      </div>

      {showCreate && (
        <CreateVoiceoverForm
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {voiceovers === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 bg-panel border border-line rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {voiceovers?.length === 0 && !showCreate && (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-10 text-center text-sm text-neutral-500">
          Озвучек пока нет — нажмите "Добавить озвучку", чтобы создать первую
        </div>
      )}

      {voiceovers && voiceovers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {voiceovers.map((v) => (
            <VoiceoverRow key={v.id} voiceover={v} />
          ))}
        </div>
      )}
    </div>
  );
}
