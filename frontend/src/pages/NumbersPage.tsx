import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import StatusBar from '../components/StatusBar';
import NumberCard from '../components/NumberCard';
import ProviderOrderControl from '../components/ProviderOrderControl';

const MAX_NUMBERS = 50;

export default function NumbersPage() {
  const [status, setStatus] = useState<any>(null);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.getStatus());
    } catch {
      // сетевой сбой — карточка status покажет прошлые данные, не блокируем UI
    }
  }, []);

  const loadNumbers = useCallback(async () => {
    try {
      setNumbers(await api.getNumbers());
    } catch {
      // аналогично — молча пропускаем один тик поллинга
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadNumbers();
  }, [loadStatus, loadNumbers]);

  useEffect(() => {
    const hasPending = numbers.some((n) => n.status === 'pending');
    if (!hasPending) return;
    const interval = setInterval(loadNumbers, 5000);
    return () => clearInterval(interval);
  }, [numbers, loadNumbers]);

  async function handleOrder(provider: string, number?: string) {
    setOrdering(true);
    setOrderError(null);
    try {
      await api.orderNumber(provider, number);
      await loadNumbers();
    } catch (err: any) {
      setOrderError(err.message || 'Не удалось заказать номер');
    } finally {
      setOrdering(false);
    }
  }

  const activeOrPendingCount = numbers.filter((n) =>
    ['active', 'pending'].includes(n.status),
  ).length;
  const limitReached = activeOrPendingCount >= MAX_NUMBERS;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Номера для обзвона</h2>
          <p className="text-sm text-neutral-500">
            {activeOrPendingCount} / {MAX_NUMBERS} использовано
          </p>
        </div>
        <ProviderOrderControl
          onOrder={handleOrder}
          disabled={limitReached}
          loading={ordering}
        />
      </div>

      <StatusBar status={status} />

      {orderError && (
        <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          {orderError}
        </div>
      )}

      {numbers.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-10 text-center text-sm text-neutral-500">
          Номеров пока нет — нажмите "Добавить номер", чтобы заказать первый
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {numbers.map((n) => (
            <NumberCard key={n.id} number={n} />
          ))}
        </div>
      )}

      {limitReached && (
        <p className="text-xs text-neutral-500 mt-4">
          Достигнут лимит в {MAX_NUMBERS} номеров. Освободите неиспользуемый, чтобы заказать новый.
        </p>
      )}
    </div>
  );
}
