import { IsIn, IsOptional, IsString } from 'class-validator';

export const NUMBER_PROVIDERS = ['telnyx', 'didww', 'didlogic'] as const;

export class OrderNumberDto {
  @IsOptional()
  @IsIn(NUMBER_PROVIDERS)
  provider?: string;

  /** Обязателен только для provider: 'didlogic' — см. pool.service.ts */
  @IsOptional()
  @IsString()
  number?: string;
}
