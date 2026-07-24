import { IsOptional, IsString } from 'class-validator';

export class TestCallDto {
  @IsString()
  toNumber: string;

  @IsString()
  @IsOptional()
  voiceoverId?: string;
}
