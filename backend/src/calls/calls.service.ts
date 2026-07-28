import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelnyxClient } from '../telnyx/telnyx.client';
import { TelnyxAccountsService } from '../telnyx-accounts/telnyx-accounts.service';
import { normalizeUaPhone } from './ua-phone.util';

export type CallMeta = { ownerId?: string; campaignId?: string };

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private client: TelnyxClient,
    private prisma: PrismaService,
    private config: ConfigService,
    private telnyxAccounts: TelnyxAccountsService,
  ) {}

  /**
   * Инициирует звонок: набирает украинский номер с одного из подключённых
   * DID, и после ответа (webhook call.answered) проигрывает сгенерированную
   * озвучку через playback_start.
   *
   * Используется и пробным звонком из админки (без `meta`), и кампаниями
   * с клиентской страницы "/" (с `meta.ownerId`/`meta.campaignId`, чтобы
   * лог звонка попал именно в таблицу этого клиента).
   *
   * Использует API-ключ ИМЕННО того Telnyx-аккаунта, которому принадлежит
   * выбранный номер (telnyxAccountId на PoolNumber) — это важно при
   * мультиаккаунте, иначе Telnyx отклонит звонок с "чужого" для ключа номера.
   */
  async initiateTestCall(rawToNumber: string, voiceoverId?: string, meta: CallMeta = {}) {
    const toNumber = normalizeUaPhone(rawToNumber);
    if (!toNumber) {
      throw new BadRequestException(
        'Некорректный украинский номер. Ожидается формат +380XXXXXXXXX',
      );
    }

    if (voiceoverId) {
      const voiceover = await this.prisma.voiceover.findUnique({
        where: { id: voiceoverId },
      });
      if (!voiceover) {
        throw new BadRequestException('Озвучка не найдена');
      }
    }

    const fromNumberRecord = await this.prisma.poolNumber.findFirst({
      where: { status: 'active', provider: 'telnyx' },
      orderBy: { createdAt: 'asc' },
    });
    if (!fromNumberRecord) {
      throw new BadRequestException(
        'Нет ни одного активного номера Telnyx — сейчас звонок можно инициировать только через Telnyx Call Control. Активных номеров других провайдеров (DIDWW, DIDLogic) для этого недостаточно — см. doc/DIDWW_SETUP.md и doc/DIDLOGIC_SETUP.md.',
      );
    }

    const account = fromNumberRecord.telnyxAccountId
      ? await this.telnyxAccounts.getById(fromNumberRecord.telnyxAccountId)
      : null;
    const apiKey = account?.apiKey;
    const connectionId =
      account?.connectionId || this.config.get<string>('TELNYX_CONNECTION_ID');
    if (!connectionId) {
      throw new BadRequestException(
        'Не задан TELNYX_CONNECTION_ID — ни у аккаунта, ни в legacy env-переменной',
      );
    }

    const publicBackendUrl = this.config.get<string>('PUBLIC_BACKEND_URL');
    if (!publicBackendUrl) {
      throw new BadRequestException(
        'PUBLIC_BACKEND_URL не задан — без него Telnyx не сможет достучаться до вебхука звонка',
      );
    }

    const webhookUrl = `${publicBackendUrl}/api/calls/webhooks/telnyx-call`;

    const order = await this.client.createCall({
      to: toNumber,
      from: fromNumberRecord.phoneNumber,
      connectionId,
      webhookUrl,
      apiKey,
    });

    const callControlId = order.data?.call_control_id;

    const log = await this.prisma.testCallLog.create({
      data: {
        toNumber,
        fromNumber: fromNumberRecord.phoneNumber,
        voiceoverId,
        provider: fromNumberRecord.provider,
        providerCallId: callControlId,
        telnyxAccountId: fromNumberRecord.telnyxAccountId,
        ownerId: meta.ownerId,
        campaignId: meta.campaignId,
        status: 'initiated',
      },
    });

    this.logger.log(
      `Call initiated: ${toNumber} (call ${callControlId}, account ${account?.label || 'legacy env'})`,
    );
    return log;
  }

  async handleCallAnswered(callControlId: string) {
    const log = await this.prisma.testCallLog.findUnique({
      where: { providerCallId: callControlId },
    });
    if (!log) return;

    await this.prisma.testCallLog.update({
      where: { id: log.id },
      data: { status: 'answered', startedAt: new Date() },
    });

    if (log.voiceoverId) {
      const voiceover = await this.prisma.voiceover.findUnique({
        where: { id: log.voiceoverId },
      });
      if (voiceover) {
        const account = log.telnyxAccountId
          ? await this.telnyxAccounts.getById(log.telnyxAccountId)
          : null;
        await this.client.playbackStart(callControlId, voiceover.audioUrl, account?.apiKey);
        return;
      }
    }

    // Нет озвучки для проигрывания — вешать трубку сразу же после ответа,
    // иначе звонок останется висеть без каких-либо дальнейших команд.
    await this.handleCallPlaybackEnded(callControlId);
  }

  /**
   * Событие "проигрывание завершилось" — после того как Telnyx доиграл
   * mp3 через playback_start. Это одноразовый announcement-звонок (сказать
   * фразу и повесить трубку), не интерактивный IVR — поэтому вешаем трубку
   * сразу же, не дожидаясь, пока собеседник положит трубку сам.
   */
  async handleCallPlaybackEnded(callControlId: string) {
    const log = await this.prisma.testCallLog.findUnique({
      where: { providerCallId: callControlId },
    });
    if (!log) return;

    const account = log.telnyxAccountId
      ? await this.telnyxAccounts.getById(log.telnyxAccountId)
      : null;

    try {
      await this.client.hangupCall(callControlId, account?.apiKey);
    } catch (err: any) {
      // Звонок мог уже завершиться сам (собеседник положил трубку раньше,
      // чем доиграла озвучка) — Telnyx в этом случае вернёт ошибку на
      // попытку повесить уже несуществующий звонок, это не critical.
      this.logger.warn(`hangupCall after playback failed for ${callControlId}: ${err.message}`);
    }
  }

  async handleCallHangup(callControlId: string) {
    await this.prisma.testCallLog.updateMany({
      where: { providerCallId: callControlId },
      data: { status: 'completed', endedAt: new Date() },
    });
  }

  async handleCallFailed(callControlId: string, reason?: string) {
    await this.prisma.testCallLog.updateMany({
      where: { providerCallId: callControlId },
      data: { status: 'failed', failureReason: reason, endedAt: new Date() },
    });
  }

  listCallLogs() {
    return this.prisma.testCallLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listCallLogsForOwner(ownerId: string) {
    return this.prisma.testCallLog.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
