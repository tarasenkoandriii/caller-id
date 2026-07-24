# ==============================================================================
# ВАЖНО: этот Dockerfile используется ТОЛЬКО для локальной отладки через
# docker-compose (см. docker-compose.yml в корне проекта). Деплой на
# Vercel Hobby идёт своим отдельным путём (backend/vercel.json,
# @vercel/node собирает dist/main.js напрямую) и этот файл не трогает —
# так что Docker и Vercel-деплой полностью независимы друг от друга.
# ==============================================================================

FROM node:20-alpine AS base
WORKDIR /app
# openssl и libc6-compat — известный гочка Prisma query engine на Alpine
RUN apk add --no-cache openssl libc6-compat

# ---- dev: используется docker-compose для локальной разработки с hot-reload ----
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .
# ВАЖНО: `prisma generate` здесь НЕ вызывается — на этапе сборки образа
# переменная DATABASE_URL ещё недоступна (.env намеренно не копируется в
# образ, а сама переменная приходит только через docker-compose при запуске
# контейнера), а `prisma generate` требует, чтобы env-переменная datasource
# существовала уже на этапе валидации схемы. Поэтому generate перенесён в
# docker-entrypoint.sh, который выполняется уже с полным набором env.
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]

# ---- build: только как референс, если когда-нибудь понадобится собрать
#      прод-образ вне Vercel (например, для другого хостинга). Не используется
#      ни docker-compose (там всегда dev-стадия), ни Vercel-деплоем. ----
FROM base AS build
# Плейсхолдер только для валидации схемы на этапе `generate` — реальное
# подключение к БД в этой стадии не выполняется.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- prod: аналогично build — не используется ни docker-compose, ни Vercel ----
FROM base AS prod
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main.js"]
