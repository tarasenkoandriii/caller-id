import 'reflect-metadata';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

/**
 * Backend теперь всегда деплоится в ОДНОМ Vercel-проекте вместе с
 * фронтендом (см. корневой vercel.json) — единый домен, единый деплой,
 * по образцу SilverFinance. Чтобы пути backend'а не путались с роутами
 * фронтенд-SPA (у обоих есть, например, свой "/admin_panel_2026/admins" —
 * у фронтенда это страница-вкладка, у бэкенда был бы GET-эндпоинт с ровно
 * таким же путём), ВЕСЬ backend живёт под общим неймспейсом "/api/*".
 *
 * Здесь и раньше был отдельный внутренний префикс "/admin_panel_2026" для
 * админской части API (в отличие от client-* эндпоинтов) — он никуда не
 * делся, просто теперь вложен под "/api": итоговый путь —
 * "/api/admin_panel_2026/pool/status" и т.п.
 */
export const ADMIN_ROUTE_PREFIX = 'api/admin_panel_2026';

/** Настраивает уже созданный Nest-app: CORS, глобальный префикс, валидацию. Без app.listen() — это отдельно в main.ts (Docker/local) и api/index.ts (Vercel). */
export function configureApp(app: INestApplication | NestExpressApplication) {
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  app.setGlobalPrefix(ADMIN_ROUTE_PREFIX, {
    exclude: [
      { path: 'api/telnyx/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'api/calls/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'api/didww/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'api/cron/(.*)', method: RequestMethod.ALL },
      { path: 'api/client-auth/(.*)', method: RequestMethod.ALL },
      { path: 'api/client-contacts/(.*)', method: RequestMethod.ALL },
      { path: 'api/client-campaigns/(.*)', method: RequestMethod.ALL },
      { path: 'api/client-voiceovers/(.*)', method: RequestMethod.ALL },
      { path: 'api/client-bootstrap', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}

export async function createApp() {
  const app = await NestFactory.create(AppModule, { cors: true });
  return configureApp(app);
}
