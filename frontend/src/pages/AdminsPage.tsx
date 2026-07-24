import { useEffect, useState } from 'react';
import { api } from '../api';

type Admin = { identifier: string; provider: string; enabled: boolean };

const PROVIDER_LABELS: Record<string, string> = {
  password: 'Email + пароль',
  google: 'Google',
  telegram: 'Telegram',
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);

  useEffect(() => {
    api.getAdmins().then(setAdmins).catch(() => setAdmins([]));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Администраторы</h2>
      <p className="text-sm text-neutral-500 mb-6">
        Доступ управляется через ADMIN_EMAIL, ALLOWED_GMAIL_EMAILS и ALLOWED_TELEGRAM_IDS на бэкенде
      </p>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_120px] px-5 py-3 text-xs text-neutral-500 border-b border-line">
          <span>Идентификатор</span>
          <span>Способ входа</span>
          <span>Включён</span>
        </div>

        {admins === null &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_140px_120px] px-5 py-4 border-b border-line last:border-0"
            >
              <div className="h-4 w-40 bg-line rounded animate-pulse" />
              <div className="h-4 w-20 bg-line rounded animate-pulse" />
              <div className="h-4 w-4 bg-line rounded-full animate-pulse" />
            </div>
          ))}

        {admins?.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-neutral-500">
            Список админов пуст — проверьте переменные окружения
          </div>
        )}

        {admins?.map((admin) => (
          <div
            key={admin.identifier}
            className="grid grid-cols-[1fr_140px_120px] items-center px-5 py-4 border-b border-line last:border-0"
          >
            <span className="text-sm text-white font-mono-num">{admin.identifier}</span>
            <span className="text-xs text-neutral-400">
              {PROVIDER_LABELS[admin.provider] || admin.provider}
            </span>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent">
              ✓
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
