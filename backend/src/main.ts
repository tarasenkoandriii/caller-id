import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

export const ADMIN_ROUTE_PREFIX = 'admin_panel_2026';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Весь роутинг живёт под /admin_panel_2026, кроме вебхуков Telnyx — их
  // URL уже зарегистрирован в Telnyx Portal и должен оставаться стабильным.
  app.setGlobalPrefix(ADMIN_ROUTE_PREFIX, {
    exclude: [
      { path: 'telnyx/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'calls/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'didww/webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'cron/(.*)', method: RequestMethod.ALL },
      { path: 'client-auth/(.*)', method: RequestMethod.ALL },
      { path: 'client-contacts/(.*)', method: RequestMethod.ALL },
      { path: 'client-campaigns/(.*)', method: RequestMethod.ALL },
      { path: 'client-voiceovers/(.*)', method: RequestMethod.ALL },
      { path: 'client-bootstrap', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Caller ID API running on port ${port} under /${ADMIN_ROUTE_PREFIX}`);
}
bootstrap();
