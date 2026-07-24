import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVoiceoverDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsString()
  @MinLength(1)
  voiceId: string;

  @IsString()
  @IsOptional()
  voiceName?: string;
}
