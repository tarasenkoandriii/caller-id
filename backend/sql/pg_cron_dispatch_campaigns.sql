-- ============================================================================
-- pg_cron + pg_net: поминутный диспетчер кампаний обзвона
-- ============================================================================
-- Выполнить один раз в Supabase → SQL Editor (после того как включены
-- расширения pg_cron и pg_net — Database → Extensions в дашборде Supabase,
-- либо см. команды ниже, если у вашей роли есть права на CREATE EXTENSION).
--
-- Идея: вместо Vercel Cron (на Hobby-плане — не чаще раза в сутки) или
-- внешнего пингера — сама база Postgres каждую минуту дёргает бэкенд через
-- pg_net (асинхронный HTTP-клиент внутри Postgres). Работает одинаково на
-- любом тарифе Vercel, потому что триггер идёт не от Vercel, а от Supabase.
--
-- Перед запуском замените:
--   <BACKEND_URL>    → https://<ваш-backend>.vercel.app
--   <CRON_SECRET>    → то же значение, что в backend/.env → CRON_SECRET
-- ============================================================================

-- 1) Расширения (если ещё не включены — обычно требует прав суперпользователя;
--    в Supabase проще включить через Dashboard → Database → Extensions,
--    но команды ниже сработают, если у вашей роли достаточно прав)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 2) Сам job: каждую минуту POST на /api/cron/dispatch-campaigns
select cron.schedule(
  'dispatch-client-campaigns',           -- имя job'а (уникальное)
  '* * * * *',                           -- каждую минуту
  $$
  select net.http_post(
    url     := '<BACKEND_URL>/api/cron/dispatch-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- Проверка и обслуживание
-- ============================================================================

-- Список всех job'ов pg_cron в этой базе
-- select * from cron.job;

-- История запусков (последние 20) — статус, время, ошибки net.http_post
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Приостановить job, не удаляя (например, на время отладки)
-- select cron.unschedule('dispatch-client-campaigns');

-- pg_net не блокирует транзакцию — сам HTTP-запрос выполняется асинхронно,
-- ответ можно посмотреть в net._http_response (Supabase создаёт эту
-- служебную таблицу автоматически при включении pg_net):
-- select * from net._http_response order by created desc limit 20;
