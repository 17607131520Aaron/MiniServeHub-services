import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MiniAppLoginResponseDto {
  @ApiProperty({ description: '微信 openid' })
  @Expose()
  public openid!: string;

  @ApiProperty({ description: '后端签发的访问令牌（JWT）' })
  @Expose()
  public token!: string;
}

export class MiniAppUserInfoResponseDto {
  @ApiProperty({ description: '微信 openid' })
  @Expose()
  public openid!: string;

  @ApiPropertyOptional({ description: '昵称' })
  @Expose()
  public nickname?: string | null;

  @ApiPropertyOptional({ description: '头像地址' })
  @Expose()
  public avatarUrl?: string | null;

  @ApiPropertyOptional({ description: '性别：0未知 1男 2女' })
  @Expose()
  public gender?: number | null;

  @ApiPropertyOptional({ description: '国家' })
  @Expose()
  public country?: string | null;

  @ApiPropertyOptional({ description: '省份' })
  @Expose()
  public province?: string | null;

  @ApiPropertyOptional({ description: '城市' })
  @Expose()
  public city?: string | null;

  @ApiPropertyOptional({ description: '语言' })
  @Expose()
  public language?: string | null;

  @ApiPropertyOptional({ description: '手机号（可能为空或脱敏）' })
  @Expose()
  public phoneNumber?: string | null;

  @ApiPropertyOptional({ description: '主用户ID（与 users 表关联）' })
  @Expose()
  public userId?: number | null;

  @ApiPropertyOptional({ description: '最后登录时间' })
  @Expose()
  public lastLoginAt?: Date | null;
}

