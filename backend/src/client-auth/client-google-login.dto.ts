import { IsString, MinLength } from 'class-validator';

export class ClientGoogleLoginDto {
  @IsString()
  @MinLength(20)
  idToken: string;
}
