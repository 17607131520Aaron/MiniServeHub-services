import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 微信登录接口入参数
 */

export class WechatLoginDto {
  @ApiProperty({ description: 'wx.login 返回的 code' })
  @IsNotEmpty()
  @IsString()
  public code: string;

  // 可选：用户资料（前端若有则一并传递）
  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  public nickname?: string;

  @ApiPropertyOptional({ description: '头像地址' })
  @IsOptional()
  @IsString()
  public avatarUrl?: string;

  @ApiPropertyOptional({ description: '性别：0未知 1男 2女', minimum: 0, maximum: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  public gender?: number; // 0未知 1男 2女

  @ApiPropertyOptional({ description: '国家' })
  @IsOptional()
  @IsString()
  public country?: string;

  @ApiPropertyOptional({ description: '省份' })
  @IsOptional()
  @IsString()
  public province?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  public city?: string;

  @ApiPropertyOptional({ description: '语言' })
  @IsOptional()
  @IsString()
  public language?: string;

  @ApiPropertyOptional({ description: '手机号（建议脱敏/加密）' })
  @IsOptional()
  @IsString()
  public phoneNumber?: string;

  // 可选：与主用户表打通的绑定
  @ApiPropertyOptional({ description: '主用户ID（与 users 绑定）' })
  @IsOptional()
  @IsInt()
  public userId?: number;
}

export class WechatLoginResponseDto {
  @ApiProperty({ description: '微信 openid' })
  @Expose()
  public openid: string;

  @ApiProperty({ description: '微信 session_key' })
  @Expose()
  public session_key: string;
}

export class WechatEncryptedDataDto {
  @ApiProperty({ description: '微信 openid（后端据此查 sessionKey）' })
  @IsNotEmpty()
  @IsString()
  public openid: string;

  @ApiProperty({ description: '前端获取的 encryptedData（Base64）' })
  @IsNotEmpty()
  @IsString()
  public encryptedData: string;

  @ApiProperty({ description: '前端获取的 iv（Base64）' })
  @IsNotEmpty()
  @IsString()
  public iv: string;
}

export class WechatUserProfileResponseDto {
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
}

/**
 * 用户信息详情
 */

export class UserInfoResponseDto {
  @Expose()
  public username: string;

  @Expose()
  public email: string;

  @Expose()
  public phone: string;

  @Expose()
  public status: number;

  @Expose()
  public createdAt: Date;

  @Expose()
  public updatedAt: Date;
}
