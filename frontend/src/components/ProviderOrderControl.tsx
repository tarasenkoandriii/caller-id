import { useEffect, useRef, useState } from 'react';

export const PROVIDERS = [
  { id: 'telnyx', label: 'Telnyx', available: true, requiresManualNumber: false },
  { id: 'didww', label: 'DIDWW', available: true, requiresManualNumber: false },
  { id: 'didlogic', label: 'DIDLogic', available: true, requiresManualNumber: true },
];

export default function ProviderOrderControl({
  onOrder,
  disabled,
  loading,
}: {
  onOrder: (provider: string, number?: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const [provider, setProvider] = useState('telnyx');
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = PROVIDERS.find((p) => p.id === provider)!;
  const needsNumber = selected.requiresManualNumber;
  const canSubmit = selected.available && (!needsNumber || manualNumber.trim().length > 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSubmit() {
    if (!canSubmit) return;
    onOrder(provider, needsNumber ? manualNumber.trim() : undefined);
  }

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0" ref={rootRef}>
      <div className="relative flex">
        <button
          onClick={handleSubmit}
          disabled={disabled || loading || !canSubmit}
          className="flex items-center gap-2 bg-accent text-ink text-sm font-medium rounded-l-lg pl-4 pr-3 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
        >
          <span>{loading ? 'Заказываем…' : '+ Добавить номер'}</span>
          <span className="text-xs font-normal opacity-70">· {selected.label}</span>
        </button>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={disabled || loading}
          aria-label="Выбрать провайдера"
          className="flex items-center justify-center bg-accent text-ink rounded-r-lg px-2.5 py-2 border-l border-ink/20 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-panel border border-line rounded-lg overflow-hidden shadow-xl z-10">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  setMenuOpen(false);
                }}
                disabled={!p.available}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                  p.id === provider ? 'bg-accent/10 text-accent' : 'text-white hover:bg-ink'
                } disabled:text-neutral-500 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
              >
                <span>{p.label}</span>
                {!p.available && <span className="text-xs text-neutral-500">скоро</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {needsNumber && (
        <div className="flex flex-col items-end gap-1">
          <input
            type="text"
            value={manualNumber}
            onChange={(e) => setManualNumber(e.target.value)}
            placeholder="380441234567"
            className="w-48 bg-ink border border-line rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-accent font-mono-num text-right"
          />
          <p className="text-xs text-neutral-500 text-right max-w-48">
            DIDLogic требует конкретный номер (E.164) — посмотрите доступные в личном кабинете DIDLogic → Buy
          </p>
        </div>
      )}
    </div>
  );
}
