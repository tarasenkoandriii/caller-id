# Caller ID — обзвон Украина

Полностью автоматический сервис управления Telnyx-номерами и озвучкой для
обзвона: логин (email/пароль, Google или Telegram), три вкладки — админы,
номера, озвучка ElevenLabs с пробным SIP-звонком.

**Деплой — один Vercel-проект, один домен** (по образцу SilverFinance): backend
(NestJS) отдаётся как serverless-функция под `/api/*`, frontend (Vite/React)
— статикой на том же домене. Конфигурация — в корневом `vercel.json`,
подробности и почему backend живёт именно под `/api/*` — в
[`doc/VERCEL_DEPLOY_SETUP.md`](./doc/VERCEL_DEPLOY_SETUP.md).

## Два фронтенда в одном приложении

- **`/admin_panel_2026`** — внутренняя админка (описана ниже, доступ по
  email+паролю, Google из `ALLOWED_GMAIL_EMAILS` или Telegram из
  `ALLOWED_TELEGRAM_IDS`). API — `/api/admin_panel_2026/*`.
- **`/`** — публичная клиентская страница обзвона: свой логин через Google
  или Telegram (без ограничения по списку — открыто всем), список номеров, генерация озвучки,
  запуск обзвона (сейчас / сегодня в HH:MM / каждые N минут) и лог звонков.
  API — `/api/client-*`. Подробности и **важная оговорка про Vercel Cron** — в
  `doc/CLIENT_PAGE_SETUP.md`.

## Вкладки админки

1. **Админы** — список email с доступом (из `ADMIN_EMAIL` + `ALLOWED_GMAIL_EMAILS`), у всех зелёная галочка "включён". Включение/отключение конкретного админа пока не реализовано — доступ полностью контролируется этими env-переменными.
2. **Номера** — кнопка "Добавить номер" сверху справа, ниже мини-статистика (баланс аккаунта, статус SIP-коннекшена), затем карточки номеров.
3. **Озвучка** — кнопка "Добавить озвучку" сверху справа открывает форму (textarea + выбор голоса ElevenLabs + кнопка "Озвучить"). Каждая готовая озвучка — карточка с плеером для прослушивания, полем украинского номера с валидацией (`+380XXXXXXXXX`) и кнопкой "Звонок", которая инициирует пробный SIP-звонок и проигрывает озвучку сразу после того, как подняли трубку.
4. **Telnyx** — мультиаккаунт: плашка сверху с суммарной статистикой (баланс по всем аккаунтам, число номеров, активных подключений), чекбокс "Использовать VPN для запросов к Telnyx" (по умолчанию выключен, задизейблен без настроенного прокси в `.env`), кнопка "Добавить аккаунт" и карточки по каждому аккаунту (баланс, статус Call Control Application, число номеров, включение/отключение/удаление, отметка активного аккаунта зелёной галочкой). Подробнее — в `doc/TELNYX_SETUP.md`, разделы 0 и 0.1.
   ⚠️ API-ключи аккаунтов сейчас хранятся в БД как есть (без шифрования) — приемлемо для боилерплейта/внутреннего инструмента, но перед продакшеном с внешним доступом стоит добавить шифрование at-rest (например через `pgcrypto` в Supabase) или вынести ключи в секрет-менеджер.

## Документация

- Подробная пошаговая инструкция по подключению Telnyx (регистрация, API-ключ, пополнение баланса, SIP Connection, вебхуки) — в [`doc/TELNYX_SETUP.md`](./doc/TELNYX_SETUP.md).
- Подключение DIDWW для провижининга номеров, включая **важное архитектурное ограничение** (DIDWW не даёт звонить программно) — в [`doc/DIDWW_SETUP.md`](./doc/DIDWW_SETUP.md).
- Подключение DIDLogic — требует тарифа Plus+, ручного указания конкретного номера (нет автопоиска по стране) и имеет то же ограничение по звонкам, что и DIDWW — в [`doc/DIDLOGIC_SETUP.md`](./doc/DIDLOGIC_SETUP.md).
- Клиентская страница обзвона на "/" (Google-логин без allowlist, список номеров, озвучка, планировщик, лог звонков) — включая настройку **pg_cron + pg_net для поминутной точности обзвона** (рекомендуемый вариант, не зависит от тарифа Vercel) — в [`doc/CLIENT_PAGE_SETUP.md`](./doc/CLIENT_PAGE_SETUP.md) и готовый скрипт [`backend/sql/pg_cron_dispatch_campaigns.sql`](./backend/sql/pg_cron_dispatch_campaigns.sql).
- Локальная отладка через Docker (Postgres + backend + frontend + Adminer одной командой, без влияния на деплой Vercel) — в [`doc/DOCKER_SETUP.md`](./doc/DOCKER_SETUP.md).
- Вход через Telegram (админка + клиентская страница) — создание бота, `/setdomain`, изоляция данных между Google/Telegram-пользователями — в [`doc/TELEGRAM_LOGIN_SETUP.md`](./doc/TELEGRAM_LOGIN_SETUP.md).
- Telegram Mini App для клиентской страницы (автологин через `initData`, `/client-bootstrap`, нативная MainButton) — админка при этом остаётся desktop-only — в [`doc/TELEGRAM_MINIAPP_SETUP.md`](./doc/TELEGRAM_MINIAPP_SETUP.md).
- Настройка деплоя на Vercel для монорепо (Root Directory для `backend`/`frontend` по отдельности, `ignoreCommand`) — в [`doc/VERCEL_DEPLOY_SETUP.md`](./doc/VERCEL_DEPLOY_SETUP.md).

## Структура

```
caller-id/
├── vercel.json  Единый конфиг деплоя (backend + frontend одним проектом)
├── backend/     NestJS API — прод: backend/api/index.ts (serverless);
│                Docker/локально: backend/src/main.ts (app.listen)
└── frontend/    React + Tailwind + React Router, Vite
```

## Быстрый старт

### Вариант 1 — Docker (рекомендуется для локальной отладки, включая БД)

```bash
cp backend/.env.example backend/.env    # заполнить реальные ключи
cp frontend/.env.example frontend/.env
docker compose up --build
```

Поднимает Postgres + backend (hot-reload) + frontend (Vite dev) + Adminer
для просмотра БД одной командой, без установки Postgres/Node локально.
Подробности, типичные проблемы и важные оговорки (вебхукам нужен ngrok,
pg_cron локально недоступен) — в [`doc/DOCKER_SETUP.md`](./doc/DOCKER_SETUP.md).
**Никак не влияет на прод-деплой** — тот идёт единым Vercel-проектом (см. ниже).

### Вариант 2 — вручную (Node + Postgres на хосте)

#### Backend

```bash
cd backend
cp .env.example .env   # заполнить все переменные, см. таблицу ниже
npm install
npx prisma migrate dev --name init
npm run start:dev
```

#### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3000 (backend и frontend на разных портах — не same-origin)
npm install
npm run dev
# открыть http://localhost:5173/admin_panel_2026
```

## Деплой на Vercel

Один проект, один домен — backend и frontend деплоятся вместе через
корневой `vercel.json`. Подробная настройка (Root Directory, переменные
окружения, почему backend живёт под `/api/*`, актуальные адреса вебхуков)
— в [`doc/VERCEL_DEPLOY_SETUP.md`](./doc/VERCEL_DEPLOY_SETUP.md). Коротко:

1. **Add New → Project** в Vercel → выбрать репозиторий, **Root Directory оставить пустым** (корень репо).
2. Добавить в Environment Variables все переменные из `backend/.env.example` и `frontend/.env.example`.
3. `PUBLIC_BACKEND_URL` — бэкенд сам допишет `/api/...` к нему, задавать нужно как обычный домен без пути.
4. Зарегистрировать в Telnyx Portal → Webhooks: `https://<domain>/api/telnyx/webhooks/telnyx`.
5. Включить [Vercel Blob](https://vercel.com/docs/storage/vercel-blob), скопировать `BLOB_READ_WRITE_TOKEN`.
6. Получить ключ ElevenLabs (Profile → API Keys) → `VOICE_API_KEY`.

## Переменные окружения (backend/.env)

| Переменная | Описание |
|---|---|
| `TELNYX_API_KEY` | API-ключ из Telnyx Mission Control Portal |
| `TELNYX_CONNECTION_ID` | ID SIP-коннекшена, к которому привязываются номера и звонки |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Публичный ключ для проверки подписи вебхуков (Telnyx portal → Webhooks) |
| `TELNYX_PROXY_URL` / `WEBSHARE_PROXY_*` / `HTTPS_PROXY` | Прокси для чекбокса "Использовать VPN" во вкладке Telnyx (см. `doc/TELNYX_SETUP.md`, раздел 0.1) |
| `DIDWW_API_KEY` | API-ключ DIDWW (см. `doc/DIDWW_SETUP.md`) |
| `DIDWW_ENVIRONMENT` | `sandbox` или `production` |
| `DIDLOGIC_API_KEY` | API-ключ DIDLogic, тариф Plus+ (см. `doc/DIDLOGIC_SETUP.md`) |
| `PUBLIC_BACKEND_URL` | Публичный URL бэкенда — нужен для вебхука звонков и для доступа Telnyx к mp3 |
| `DATABASE_URL` | Postgres (Supabase) connection string |
| `JWT_SECRET` | Секрет для подписи JWT админки |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` | Логин по email+паролю (пароль хранится как bcrypt-хэш) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID для входа через Gmail |
| `ALLOWED_GMAIL_EMAILS` | Список Gmail-адресов через запятую, которым разрешён вход |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather (см. `doc/TELEGRAM_LOGIN_SETUP.md`) |
| `ALLOWED_TELEGRAM_IDS` | Numeric Telegram ID через запятую — доступ только в админку |
| `VOICE_API_KEY` | Ключ ElevenLabs (`xi-api-key`) |
| `VOICE_ID` | Голос по умолчанию, если не выбран в форме |
| `VOICE_MODEL` | Модель ElevenLabs (по умолчанию `eleven_flash_v2_5`) |
| `BLOB_READ_WRITE_TOKEN` | Токен Vercel Blob для публичного хранения mp3 |

## Настройка входа через Gmail (Google Sign-In)

1. Зайти в [Google Cloud Console](https://console.cloud.google.com/) → создать проект (или выбрать существующий).
2. **APIs & Services → OAuth consent screen** — тип **External**, заполнить название приложения; в **Test users** можно ничего не добавлять, если тип публикации оставить в статусе Testing и добавить нужные Gmail-адреса как тестовых пользователей.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` и продовый домен фронтенда (`https://<frontend>.vercel.app`)
   - Authorized redirect URIs можно не указывать — используется One Tap / popup-флоу, без редиректа.
4. Скопировать **Client ID** → указать его в:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID`
5. В `backend/.env` → `ALLOWED_GMAIL_EMAILS` перечислить через запятую все Gmail-адреса, которым разрешён вход в админку. Любой другой Google-аккаунт получит 401, даже с валидным Google-токеном.
6. Email+пароль (`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`) продолжает работать как запасной способ входа — оба варианта показаны на одном экране логина.

## Логика "Добавить номер"

1. `POST /api/admin_panel_2026/pool/numbers/order` → ищет доступный номер UA → создаёт `number_order` в Telnyx → пишет запись в БД со статусом `pending`.
2. Telnyx асинхронно шлёт вебхук `number_order.completed` → бэкенд обновляет статус на `active`.
3. Фронтенд поллит `GET /api/admin_panel_2026/pool/numbers` каждые 5 сек, пока есть номера в статусе `pending`.

## Логика пробного звонка с озвучкой

1. `POST /api/admin_panel_2026/voiceovers` → ElevenLabs синтезирует mp3 → файл заливается в Vercel Blob (публичный URL) → запись сохраняется в БД.
2. `POST /api/admin_panel_2026/calls/test` → берёт первый активный номер из своей БД как `from`, инициирует звонок через Telnyx Call Control API (`POST /calls`) с `webhook_url` на публичный адрес бэкенда.
3. Когда трубку поднимают, Telnyx шлёт вебхук `call.answered` → бэкенд вызывает `playback_start` с `audio_url` сгенерированной озвучки.
4. `call.hangup` обновляет статус лога звонка на `completed`.
