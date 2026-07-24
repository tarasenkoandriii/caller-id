import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export const SCHEDULE_TYPES = ['now', 'once', 'interval'] as const;

export class CreateCampaignDto {
  @IsString()
  voiceoverId: string;

  @IsIn(SCHEDULE_TYPES)
  scheduleType: string;

  /** Обязателен для scheduleType: 'once' — ISO-дата сегодняшнего времени звонка */
  @IsOptional()
  @IsISO8601()
  scheduleAt?: string;

  /** Обязателен для scheduleType: 'interval' — раз в N минут */
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMinutes?: number;
}
