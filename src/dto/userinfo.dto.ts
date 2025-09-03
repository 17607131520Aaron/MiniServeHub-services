import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserInfoDto {
  @IsNotEmpty()
  @IsString()
  public username: string;

  @IsNotEmpty()
  @IsString()
  public password: string;
}

export class UserInfoResponseDto {
  @Expose()
  public username: string;

  @Expose()
  public password: string;
}
