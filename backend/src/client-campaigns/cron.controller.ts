import {
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientCampaignsService } from './client-campaigns.service';

/**
 * Дёргается Vercel Cron (см. vercel.json) или внешним пингером
 * (cron-job.org и т.п. — см. doc/CLIENT_PAGE_SETUP.md про ограничения
 * Vercel Cron на Hobby-плане). Не защищён JWT — это не пользовательский
 * эндпоинт, поэтому проверяется общий секрет в заголовке.
 *
 * ВАЖНО: Vercel Cron умеет посылать только GET-запросы — поэтому эндпоинт
 * отвечает на GET (для Vercel Cron) и на POST (для ручного/внешнего вызова,
 * например из cron-job.org, который может слать любой метод).
 */
@Controller('cron')
export class CronController {
  constructor(
    private campaignsService: ClientCampaignsService,
    private config: ConfigService,
  ) {}

  @Get('dispatch-campaigns')
  dispatchCampaignsGet(
    @Headers('x-cron-secret') customHeader: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.dispatch(customHeader, authHeader);
  }

  @Post('dispatch-campaigns')
  dispatchCampaignsPost(
    @Headers('x-cron-secret') customHeader: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.dispatch(customHeader, authHeader);
  }

  private dispatch(customHeader: string, authHeader: string) {
    const expected = this.config.get<string>('CRON_SECRET');
    if (expected) {
      // Vercel Cron автоматически шлёт `Authorization: Bearer $CRON_SECRET`,
      // если переменная CRON_SECRET задана в проекте — поддерживаем и это,
      // и произвольный заголовок x-cron-secret для внешних пингеров.
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (customHeader !== expected && bearerToken !== expected) {
        throw new UnauthorizedException('Неверный CRON_SECRET');
      }
    }
    return this.campaignsService.dispatchDue();
  }
}
