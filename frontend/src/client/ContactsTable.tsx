import { useState } from 'react';
import { clientApi } from './clientApi';

type Contact = { id: string; phoneNumber: string; createdAt: string };

export default function ContactsTable({
  contacts,
  onChanged,
}: {
  contacts: Contact[];
  onChanged: () => void;
}) {
  const [newNumber, setNewNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newNumber.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await clientApi.addContact(newNumber.trim());
      setNewNumber('');
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Не удалось добавить номер');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError(null);
    try {
      await clientApi.removeContact(id);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить номер');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3">Номера для обзвона</h2>

      <div className="flex gap-2 mb-3">
        <input
          type="tel"
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="+380XXXXXXXXX"
          className="flex-1 bg-ink border border-line rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent font-mono-num"
        />
        <button
          onClick={handleAdd}
          disabled={!newNumber.trim() || adding}
          className="bg-accent text-ink text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          {adding ? '…' : '+ Добавить'}
        </button>
      </div>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-500">
            Список пуст — добавьте хотя бы один номер
          </div>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-line last:border-0"
            >
              <span className="text-sm text-white font-mono-num">{c.phoneNumber}</span>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={removingId === c.id}
                className="text-xs text-danger hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
