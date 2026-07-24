import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTelnyxAccountDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  connectionId: string;
}
