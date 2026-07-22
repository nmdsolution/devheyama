import { IsNotEmpty, IsString } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
