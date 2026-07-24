import { createApp, ADMIN_ROUTE_PREFIX } from './bootstrap';

/**
 * Точка входа ТОЛЬКО для Docker/локальной разработки (app.listen на порту) —
 * см. docker-entrypoint.sh и `npm run start:dev`. Vercel этот файл не
 * использует вообще: там отдельный serverless-entrypoint api/index.ts,
 * который переиспользует ту же конфигурацию через bootstrap.ts, но не
 * вызывает app.listen() (serverless-функции не слушают порт напрямую).
 */
async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Caller ID API running on port ${port} under /${ADMIN_ROUTE_PREFIX}`);
}
bootstrap();
