import { useCallback, useEffect, useState } from 'react';
import { clientApi, clientLogout, isClientAuthenticated, saveClientToken } from './clientApi';
import { getTelegramInitData, initTelegramWebApp, isInTelegramMiniApp } from './telegramWebApp';
import ClientLoginPage from './ClientLoginPage';
import ContactsTable from './ContactsTable';
import VoiceoverPanel from './VoiceoverPanel';
import CallScheduler from './CallScheduler';
import CallLogTable from './CallLogTable';

export default function ClientApp() {
  const isMiniApp = isInTelegramMiniApp();

  const [authed, setAuthed] = useState(isClientAuthenticated());
  // Внутри Mini App избегаем показа формы логина, пока идёт автологин через
  // initData — снаружи (обычный браузер) сразу видно либо приложение, либо
  // ClientLoginPage, без "мигания" промежуточного состояния.
  const [bootstrapping, setBootstrapping] = useState(isMiniApp && !authed);
  const [contacts, setContacts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [voiceoverId, setVoiceoverId] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      setContacts(await clientApi.getContacts());
    } catch {
      // не блокируем страницу на сетевом сбое одного виджета
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await clientApi.getCallLogs());
    } catch {
      // аналогично
    }
  }, []);

  // Инициализация Telegram WebView (ready/expand) — делаем это независимо
  // от того, авторизованы уже или нет, сразу при монтировании внутри Mini App.
  useEffect(() => {
    if (isMiniApp) initTelegramWebApp();
  }, [isMiniApp]);

  // Автологин внутри Telegram Mini App: один запрос — токен + все данные сразу.
  useEffect(() => {
    if (!isMiniApp || authed) return;
    (async () => {
      try {
        const initData = getTelegramInitData();
        const result = await clientApi.bootstrap(initData);
        saveClientToken(result.accessToken);
        setContacts(result.contacts);
        setLogs(result.callLogs);
        setAuthed(true);
      } catch {
        // Если bootstrap не удался (например, initData протух) — просто
        // показываем обычный логин-экран как запасной путь.
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [isMiniApp, authed]);

  useEffect(() => {
    // Обычный (не Mini App) вход — данные подтягиваем отдельными запросами,
    // как и раньше. Внутри Mini App это уже сделал bootstrap выше.
    if (!authed || isMiniApp) return;
    loadContacts();
    loadLogs();
  }, [authed, isMiniApp, loadContacts, loadLogs]);

  // Пока есть звонки не в финальном статусе — подтягиваем лог каждые 5 сек,
  // чтобы длительность и статус в таблице обновлялись почти вживую.
  useEffect(() => {
    if (!authed) return;
    const hasActive = logs.some((l) => l.status === 'initiated' || l.status === 'answered');
    if (!hasActive) return;
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [authed, logs, loadLogs]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-line border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <ClientLoginPage onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-ink px-4 sm:px-8 py-8 max-w-3xl mx-auto">
      {/* Внутри Mini App шапка Telegram уже показывает название и кнопку
          закрытия — свой заголовок и "Выйти" нужны только в обычном браузере. */}
      {!isMiniApp && (
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-white">Caller ID</h1>
          <button
            onClick={clientLogout}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <ContactsTable contacts={contacts} onChanged={loadContacts} />

        <VoiceoverPanel onVoiceoverReady={(v) => setVoiceoverId(v.id)} />

        <CallScheduler
          voiceoverId={voiceoverId}
          contactsCount={contacts.length}
          onScheduled={loadLogs}
        />

        <CallLogTable logs={logs} />
      </div>
    </div>
  );
}
