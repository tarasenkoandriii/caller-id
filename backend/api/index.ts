import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * Serverless-entrypoint для Vercel — используется ТОЛЬКО там (см. корневой
 * vercel.json: builds -> "backend/api/index.ts" -> @vercel/node). Docker и
 * локальная разработка используют src/main.ts (app.listen на порту), этот
 * файл — нет.
 *
 * NestJS изначально устроен как "слушай порт", а не "экспортируй handler",
 * поэтому здесь используется ExpressAdapter: поднимаем Nest поверх обычного
 * Express-инстанса и экспортируем сам Express как handler для
 * serverless-функции — Vercel вызывает его как (req, res) => void на каждый
 * запрос, без app.listen().
 *
 * app/Nest поднимается один раз и кешируется в module-scope переменной —
 * при "тёплом" перезапуске той же serverless-функции инициализация Nest
 * (сборка модулей, DI-граф и т.д.) не повторяется на каждый запрос.
 */
const server: Express = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  configureApp(app);
  await app.init();
}

export default async function handler(req: express.Request, res: express.Response) {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }
  await bootstrapPromise;
  server(req, res);
}
