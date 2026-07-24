import { IsString, MinLength } from 'class-validator';

export class CreateClientContactDto {
  @IsString()
  @MinLength(5)
  phoneNumber: string;
}
