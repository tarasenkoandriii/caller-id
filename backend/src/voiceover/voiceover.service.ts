import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ElevenLabsClient } from './elevenlabs.client';

const MAX_TEXT_LENGTH = 2000;

@Injectable()
export class VoiceoverService {
  constructor(
    private client: ElevenLabsClient,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  listVoices() {
    return this.client.listVoices();
  }

  /** Вкладка "Озвучка" в админке — только озвучки без владельца (ownerId: null) */
  listVoiceovers() {
    return this.prisma.voiceover.findMany({
      where: { ownerId: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Клиентская страница "/" — только озвучки конкретного клиента */
  listVoiceoversForOwner(ownerId: string) {
    return this.prisma.voiceover.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createVoiceover(text: string, voiceId: string, voiceName?: string) {
    return this.generate(text, voiceId, voiceName, null);
  }

  createVoiceoverForOwner(ownerId: string, text: string, voiceId: string, voiceName?: string) {
    return this.generate(text, voiceId, voiceName, ownerId);
  }

  private async generate(
    text: string,
    voiceId: string,
    voiceName: string | undefined,
    ownerId: string | null,
  ) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Текст озвучки не может быть пустым');
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(
        `Текст слишком длинный (максимум ${MAX_TEXT_LENGTH} символов)`,
      );
    }

    const audioBuffer = await this.client.textToSpeech(trimmed, voiceId);

    const blobToken = this.config.get<string>('BLOB_READ_WRITE_TOKEN');
    if (!blobToken) {
      throw new InternalServerErrorException('BLOB_READ_WRITE_TOKEN не задан');
    }

    // Публичный mp3-URL нужен, чтобы Telnyx Call Control мог проиграть его
    // в звонке через playback_start — храним ссылку, а не сам файл в БД.
    const { put } = await import('@vercel/blob');
    const blob = await put(
      `voiceovers/${Date.now()}-${voiceId}.mp3`,
      audioBuffer,
      { access: 'public', token: blobToken, contentType: 'audio/mpeg', addRandomSuffix: true },
    );

    return this.prisma.voiceover.create({
      data: {
        text: trimmed,
        voiceId,
        voiceName,
        audioUrl: blob.url,
        ownerId,
      },
    });
  }
}
