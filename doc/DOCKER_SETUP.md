# Локальная отладка через Docker

Полная докеризация: Postgres, backend (NestJS, hot-reload) и frontend (Vite
dev-сервер) поднимаются одной командой. **Деплой на Vercel Hobby при этом
никак не меняется** — Vercel как использовал `backend/vercel.json` и
`frontend/vercel.json` напрямую (без Docker), так и продолжает. Файлы
`Dockerfile` в проекте Vercel просто не видит и не читает.

## Быстрый старт

```bash
cp backend/.env.example backend/.env      # заполнить реальные ключи (Telnyx, ElevenLabs и т.д.)
cp frontend/.env.example frontend/.env
docker compose up --build
```

После старта:
- Backend: `http://localhost:3000`
- Frontend (админка): `http://localhost:5173/admin_panel_2026`
- Frontend (клиентская страница): `http://localhost:5173/`
- Adminer (просмотр БД в браузере): `http://localhost:8080` — Система: **PostgreSQL**, Сервер: **db**, Логин/пароль: **caller_id** / **caller_id**, База: **caller_id**

Остановить: `docker compose down`. Стереть и локальную БД тоже:
`docker compose down -v` (удалит volume `caller_id_db_data`).

## Что происходит при старте backend-контейнера

`backend/docker-entrypoint.sh`:
1. Выполняет `npx prisma generate` — намеренно не на этапе сборки образа (`docker build`), а здесь, при старте контейнера: `prisma generate` требует, чтобы `DATABASE_URL` уже была доступна для валидации схемы, а на этапе сборки образа её ещё нет (`.env` в образ не копируется, реальное значение приходит только через `docker-compose` при запуске). Если увидите ошибку `Validation Error Count` при `docker build` — значит кто-то случайно вернул `prisma generate` обратно в `Dockerfile`.
2. Ждёт, пока Postgres в контейнере `db` начнёт принимать соединения (до 30 попыток по 2 сек).
3. Выполняет `npx prisma db push` — синхронизирует таблицы со схемой `prisma/schema.prisma` напрямую, **без** создания файлов миграций.
4. Запускает `npm run start:dev` (hot-reload через `nest start --watch`).

### Почему `db push`, а не `migrate deploy`/`migrate dev`

В репозитории пока нет закоммиченных файлов миграций (`prisma/migrations/`) —
для быстрой локальной отладки это не нужно, `db push` синхронизирует схему
напрямую и этого достаточно. Но `db push` **не создаёт историю миграций** —
для продакшена (реальный Supabase Postgres) перед первым деплоем стоит один
раз сгенерировать нормальную миграцию:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

Эта команда создаст `prisma/migrations/*/migration.sql` — закоммитьте эту
папку в git. После этого на проде используется `npx prisma migrate deploy`
(применяет уже готовые SQL-файлы, ничего не генерирует на лету — это
единственный безопасный для продакшена режим).

## Особенности для локальной отладки, на которые стоит обратить внимание

### Вебхуки Telnyx/DIDWW не достучатся до `localhost`

Все вебхук-эндпоинты проекта (`api/telnyx/webhooks/telnyx`, `api/calls/webhooks/telnyx-call`,
`api/didww/webhooks/order-status`) требуют, чтобы Telnyx/DIDWW могли выполнить
HTTP-запрос на ваш бэкенд — а `localhost:3000` снаружи недоступен. Для
локальной проверки этих сценариев (например, дождаться `number_order.completed`
или `call.answered`) нужен туннель наружу, например:

```bash
ngrok http 3000
```

и указать полученный `https://xxxx.ngrok-free.app` в `PUBLIC_BACKEND_URL` и
в настройках вебхуков соответствующего провайдера (временно, только на
время отладки — для боевого адреса обратно проставить домен Vercel).

Без туннеля в Docker всё равно можно тестировать: логин, CRUD номеров/аккаунтов/
контактов, генерацию озвучки, сами HTTP-запросы к Telnyx (баланс, поиск
номеров) — просто финальный шаг конкретно вебхук-зависимых сценариев
(активация номера, проигрывание озвучки в звонке) не завершится без туннеля.

### pg_cron/pg_net в локальном Postgres недоступны

`backend/sql/pg_cron_dispatch_campaigns.sql` рассчитан на управляемый
Postgres в Supabase, где эти расширения включаются одной кнопкой в
дашборде. Обычный `postgres:16-alpine` в docker-compose их не содержит.
Локально кампании с расписанием "Сегодня в HH:MM"/"Каждые N минут" можно
продиспетчерить вручную:

```bash
curl -X POST http://localhost:3000/api/cron/dispatch-campaigns \
  -H "x-cron-secret: $(grep CRON_SECRET backend/.env | cut -d= -f2)"
```

Режим "Сейчас" в обзвоне работает без этого — он диспетчеризируется сразу
же, в рамках того же HTTP-запроса.

### DATABASE_URL переопределяется автоматически

В `backend/.env` обычно лежит боевая строка подключения к Supabase — в
docker-compose она **намеренно перекрывается** переменной `DATABASE_URL` из
самого `docker-compose.yml`, указывающей на контейнер `db`. Это защита от
случайного запуска локальной отладки против прод-базы. Если нужно
специально погонять Docker-окружение против настоящего Supabase — уберите
или закомментируйте строку `DATABASE_URL` в `docker-compose.yml` под
сервисом `backend`.

### Внешние API (Telnyx, ElevenLabs, Google) — всегда настоящие

Docker поднимает локально только Postgres — все остальные интеграции
(Telnyx, DIDWW, DIDLogic, ElevenLabs, Google OAuth, Vercel Blob) продолжают
ходить в реальные внешние сервисы по ключам из `.env`, как и без Docker.
Мок-заглушек для них в проекте нет.

## Пересборка после изменения зависимостей

Если добавили/обновили пакет в `package.json`, простого перезапуска
контейнера недостаточно (named volume с `node_modules` не пересоздаётся
автоматически) — нужно пересобрать образ:

```bash
docker compose up --build backend    # или frontend
```

## Возможные проблемы

| Симптом | Причина / решение |
|---|---|
| `permission denied: docker-entrypoint.sh` | Скрипт не сохранил флаг исполняемости при распаковке архива — выполнить `chmod +x backend/docker-entrypoint.sh` и пересобрать образ |
| `docker build` падает на `RUN npx prisma generate` с `Validation Error Count: N` | `DATABASE_URL` недоступна на этапе сборки образа — `prisma generate` должен вызываться только в `docker-entrypoint.sh`, а не в `Dockerfile`. Если ошибка появилась — проверить, не добавили ли `RUN npx prisma generate` обратно в dev-стадию `backend/Dockerfile` |
| Backend зависает на "DB not ready yet" | Проверить `docker compose logs db` — контейнер Postgres мог не подняться (например, порт 5432 уже занят локальной установкой Postgres на хосте) |
| Prisma ругается на `openssl`/engine | Уже решено в `backend/Dockerfile` (`apk add openssl libc6-compat`) — если ошибка всё равно есть, пересобрать образ без кэша: `docker compose build --no-cache backend` |
| Фронтенд не видит бэкенд | `frontend/.env` → `VITE_API_URL` должен быть `http://localhost:3000` (не `http://backend:3000` — браузер на хосте не резолвит имена сервисов из docker-сети, только сам бэкенд-контейнер их видит) |
