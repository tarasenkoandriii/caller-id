import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElevenLabsClient {
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private config: ConfigService) {}

  private apiKey() {
    const key = this.config.get<string>('VOICE_API_KEY');
    if (!key) {
      throw new InternalServerErrorException('VOICE_API_KEY не задан (ключ ElevenLabs)');
    }
    return key;
  }

  /**
   * Список голосов из своей библиотеки ElevenLabs (Voice Lab), а не из
   * shared-voices — так видно и клонированные/кастомные голоса аккаунта.
   */
  async listVoices() {
    const res = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey() },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new InternalServerErrorException(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    return (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      previewUrl: v.preview_url,
      accent: v.labels?.accent || null,
    }));
  }

  /** Синтез речи, возвращает буфер mp3 */
  async textToSpeech(text: string, voiceId: string): Promise<Buffer> {
    const model = this.config.get<string>('VOICE_MODEL') || 'eleven_flash_v2_5';
    const res = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey(),
      },
      body: JSON.stringify({
        text,
        model_id: model,
        output_format: 'mp3_44100_128',
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new InternalServerErrorException(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
