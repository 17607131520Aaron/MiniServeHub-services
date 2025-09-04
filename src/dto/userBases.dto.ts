import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * 微信登录接口入参数
 */

export class WechatLoginDto {
  @IsNotEmpty()
  @IsString()
  public code: string;

  // 可选：用户资料（前端若有则一并传递）
  @IsOptional()
  @IsString()
  public nickname?: string;

  @IsOptional()
  @IsString()
  public avatarUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  public gender?: number; // 0未知 1男 2女

  @IsOptional()
  @IsString()
  public country?: string;

  @IsOptional()
  @IsString()
  public province?: string;

  @IsOptional()
  @IsString()
  public city?: string;

  @IsOptional()
  @IsString()
  public language?: string;

  @IsOptional()
  @IsString()
  public phoneNumber?: string;

  // 可选：与主用户表打通的绑定
  @IsOptional()
  @IsInt()
  public userId?: number;
}

export class WechatLoginResponseDto {
  @Expose()
  public openid: string;

  @Expose()
  public session_key: string;
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
