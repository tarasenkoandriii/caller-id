# Вход через Telegram (админка + клиентская страница)

Telegram Login Widget добавлен рядом с Google — в админку (с allowlist по
`ALLOWED_TELEGRAM_IDS`, как и Google по `ALLOWED_GMAIL_EMAILS`) и на
клиентскую страницу "/" (без ограничений, как и Google-вход туда).

---

## 1. Создание бота и получение токена

1. Написать [@BotFather](https://t.me/BotFather) в Telegram → `/newbot`.
2. Задать имя и username бота (username должен заканчиваться на `bot`, например `CallerIdLoginBot`).
3. BotFather пришлёт **API Token** — вставить в `backend/.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Username бота (без `@`) — во `frontend/.env`:
   ```
   VITE_TELEGRAM_BOT_USERNAME=CallerIdLoginBot
   ```

Один и тот же бот используется и для админки, и для клиентской страницы —
разделение по allowlist происходит на бэкенде, а не на уровне бота.

## 2. Привязка домена к боту — обязательный шаг

Telegram Login Widget **не заработает**, пока боту явно не привязан домен,
с которого виджет embedded. Это делается той же командой в BotFather:

```
/setdomain
```
→ выбрать бота → указать домен фронтенда **без пути**, например:
```
https://<frontend-domain>.vercel.app
```

**Важно:** Telegram требует настоящий HTTPS-домен — `localhost` через
`/setdomain` привязать нельзя. Для локальной отладки виджет тоже не
отобразится/не сработает на `http://localhost:5173` напрямую. Единственный
рабочий способ проверить Telegram-логин локально — пробросить туннель
(например `ngrok http 5173`) и временно привязать полученный
`https://xxxx.ngrok-free.app` через `/setdomain`, аналогично тому, как это
уже приходится делать для вебхуков Telnyx/DIDWW при локальной отладке (см.
`doc/DOCKER_SETUP.md`).

Если нужно нормально проверять Telegram-логин часто во время разработки —
проще привязать сразу боевой домен и тестировать прямо на нём после деплоя,
не гоняя туннель каждый раз.

## 3. Кто может войти

- **Админка** (`/admin_panel_2026`): вход разрешён только Telegram ID из
  `ALLOWED_TELEGRAM_IDS` (через запятую в `.env`). Узнать свой числовой ID —
  написать [@userinfobot](https://t.me/userinfobot).
- **Клиентская страница** (`/`): вход открыт **любому** пользователю
  Telegram — как и Google-вход туда же, никакого allowlist.

## 4. Изоляция данных между Google- и Telegram-пользователями

Раньше все клиентские сущности (номера, озвучки, кампании, лог звонков)
были привязаны к полю `ownerEmail`. Поскольку Telegram не даёт email, поле
переименовано в **`ownerId`** и теперь хранит:
- email — если вход был через Google;
- `telegram:<numeric id>` — если вход был через Telegram.

Это просто разные значения одного и того же идентификатора владельца —
изоляция данных между разными пользователями (неважно, через что они
вошли) работает одинаково.

## 5. Проверка подписи данных от Telegram

Telegram подписывает данные виджета HMAC-SHA256 (ключ — SHA256 от токена
бота). Проверка реализована в `backend/src/common/telegram-auth.util.ts` и
используется одинаково в админском и клиентском логине — включая проверку
свежести `auth_date` (данные старше 24 часов отклоняются, защита от
повторного использования перехваченных данных).

## 6. Итоговая таблица переменных

| Переменная | Где | Описание |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `backend/.env` | Токен бота от @BotFather |
| `ALLOWED_TELEGRAM_IDS` | `backend/.env` | Numeric ID через запятую — доступ **только в админку** |
| `VITE_TELEGRAM_BOT_USERNAME` | `frontend/.env` | Username бота без `@` |

## Полезные ссылки

- Документация виджета: https://core.telegram.org/widgets/login
- @BotFather: https://t.me/BotFather
- @userinfobot (узнать свой Telegram ID): https://t.me/userinfobot
