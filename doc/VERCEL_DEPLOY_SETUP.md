# Деплой на Vercel — один проект, один деплой (по образцу SilverFinance)

Фронтенд и бэкенд деплоятся как **один Vercel-проект**, на одном домене —
так же, как SilverFinance (единое Next.js-приложение). Здесь стек другой
(NestJS-бэкенд + Vite/React-фронтенд, а не Next.js), поэтому "один деплой"
достигается конфигурацией `vercel.json` в **корне репозитория**, которая
одновременно собирает фронтенд как статику и бэкенд как serverless-функцию.

---

## 1. Как это устроено

`vercel.json` в корне:
```json
{
  "version": 2,
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "backend/api/index.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/api/index.ts" },
    { "src": "/(.+\\.[a-zA-Z0-9]+)$", "dest": "/frontend/$1" },
    { "src": "/(.*)", "dest": "/frontend/index.html" }
  ]
}
```

**Важно про `distDir` и пути в `routes` — это два РАЗНЫХ уровня отсчёта:**
`distDir` в конфиге билдера считается **относительно папки, где лежит указанный `package.json`** (то есть относительно `frontend/`) — сборка реально запускается с `cwd = frontend/`, поэтому `vite build` кладёт файлы в `frontend/dist/`, и указывать нужно просто `"dist"`, а не `"frontend/dist"`. А вот в итоговом **output** деплоя (проверено через вкладку Source → Output конкретного деплоя) содержимое этой папки публикуется **без** сегмента `dist` — то есть реальные пути там `frontend/index.html`, `frontend/assets/...`, а не `frontend/dist/index.html`. Поэтому в `routes` тоже без `dist`. Второе правило (по расширению файла) обслуживает реальные статические файлы (JS/CSS/иконки), третье — SPA-фолбэк на `index.html` для клиентского роутинга (React Router).
- `frontend/package.json` собирается как статика (`vite build` → `frontend/dist`) — отдаётся напрямую как обычный сайт.
- `backend/api/index.ts` — serverless-функция (см. ниже, почему не `src/main.ts`).
- Весь backend API живёт под единым префиксом **`/api/*`** — специально, чтобы не пересекаться с путями фронтенд-роутинга (`/admin_panel_2026/numbers` — это страница-вкладка React Router, а не бэкенд-эндпоинт; без разделения на `/api/*` эти два "пространства путей" физически совпадали бы).
- Всё остальное (`/`, `/admin_panel_2026/*`, любые пути, не начинающиеся с `/api/`) — SPA, с fallback на `index.html` для клиентского роутинга.

## 2. Почему backend/api/index.ts, а не backend/src/main.ts

`src/main.ts` вызывает `app.listen(port)` — это модель "постоянно слушающего процесса", несовместимая с тем, как Vercel запускает serverless-функции (каждый запрос — вызов `(req, res) => {}`, без слушающего порта).

Поэтому:
- `backend/src/main.ts` — используется **только** в Docker/локальной разработке (`npm run start:dev`, `docker-entrypoint.sh`).
- `backend/api/index.ts` — отдельный serverless-entrypoint **только для Vercel**: поднимает тот же NestJS-app через `ExpressAdapter`, но экспортирует сам Express-инстанс как handler, без `app.listen()`. Инициализация Nest (сборка DI-графа) кешируется в module-scope переменной — при "тёплом" перезапуске той же функции Nest не пересоздаётся на каждый запрос.
- Оба энтрипоинта переиспользуют одну и ту же конфигурацию (CORS, глобальный префикс, ValidationPipe) через `backend/src/bootstrap.ts` — чтобы не дублировать и не рассинхронизировать её между Docker и Vercel.

## 3. Настройка в Vercel Dashboard

1. **Add New → Project** → выбрать GitHub-репозиторий `caller-id`.
2. **Root Directory** — оставить **пустым / корень** (`.`) — НЕ `backend` и НЕ `frontend`. Это ключевое отличие от предыдущей (мультипроектной) схемы.
3. **Framework Preset — обязательно проверить и, если не "Other", переключить.** Vercel часто автоопределяет фреймворк по содержимому репозитория (например, находит `nest-cli.json` и выставляет **NestJS**) и в этом случае **игнорирует frontend-часть сборки из `vercel.json` вообще** — билд идёт только для бэкенда, сайт получает `404: NOT_FOUND` на все пути. Проверить: **Settings → Build and Deployment → Framework Preset** → должно быть **Other**. Если стоит что-то другое — сменить на **Other**, **Save**, затем **Redeploy** последний деплой.
4. **Environment Variables** — добавить **все** переменные из `backend/.env.example` (API-ключи Telnyx/DIDWW/DIDLogic/ElevenLabs, `DATABASE_URL`, `JWT_SECRET`, Google/Telegram креды, `CRON_SECRET` и т.д.) **и** из `frontend/.env.example` (`VITE_GOOGLE_CLIENT_ID`; username Telegram-бота отдельно задавать не нужно — фронтенд получает его с бэкенда автоматически, см. `doc/TELEGRAM_LOGIN_SETUP.md`). `VITE_API_URL` можно не задавать вообще — по умолчанию используется пустая строка (тот же домен, относительные пути).
5. Deploy.

## 4. Публичные адреса теперь другие — обновить везде, где они использовались

Так как backend переехал под `/api/*`, все внешние адреса, на которые ссылаются сторонние сервисы, изменились:

| Было (старая мультипроектная схема) | Стало (единый деплой) |
|---|---|
| `https://<backend>.vercel.app/telnyx/webhooks/telnyx` | `https://<domain>/api/telnyx/webhooks/telnyx` |
| `https://<backend>.vercel.app/calls/webhooks/telnyx-call` | `https://<domain>/api/calls/webhooks/telnyx-call` |
| `https://<backend>.vercel.app/didww/webhooks/order-status` | `https://<domain>/api/didww/webhooks/order-status` |
| `https://<backend>.vercel.app/cron/dispatch-campaigns` | `https://<domain>/api/cron/dispatch-campaigns` |
| `PUBLIC_BACKEND_URL=https://<backend>.vercel.app` | `PUBLIC_BACKEND_URL=https://<domain>` (без изменений — код сам добавляет `/api/...`) |

Нужно переоформить: вебхук в Telnyx Portal, callback_url в DIDWW (собирается автоматически из `PUBLIC_BACKEND_URL` в коде — просто обновить саму переменную), внешний пингер cron-job.org (если используется вместо pg_cron), и `path` в `backend/sql/pg_cron_dispatch_campaigns.sql`.

## 5. Что стало не нужно

- Отдельные Vercel-проекты `caller-id-backend`/`caller-id-frontend` — если раньше создавали их отдельно, можно удалить (**Settings → Advanced → Delete Project**), они больше не нужны.
- `ignoreCommand` для раздельного пропуска билдов по папкам — при одном деплое любое изменение в любой из папок и так должно пересобирать единственный проект целиком, отдельная оптимизация тут не имеет смысла.
- Отдельные `backend/vercel.json` и `frontend/vercel.json` — удалены. Помимо того что они больше не нужны при единой схеме, `backend/vercel.json` в старом виде (`{"src": "dist/main.js", "use": "@vercel/node"}`) в принципе не мог бы корректно работать как serverless-функция — `dist/main.js` вызывает `app.listen()`, а не экспортирует handler (см. п. 2 выше про `backend/api/index.ts`), так что и в качестве референса он был бы вводящим в заблуждение.

## 6. Локальная отладка не меняется

Docker-конфигурация (`docker-compose.yml`, `doc/DOCKER_SETUP.md`) продолжает
поднимать backend и frontend как два разных процесса на разных портах
(3000 и 5173) — это удобнее для разработки (hot-reload, отдельные логи) и
никак не противоречит тому, что в проде это один Vercel-деплой. Единый
деплой — это только про то, как публикуется готовый результат, а не про то,
как ведётся локальная разработка.
