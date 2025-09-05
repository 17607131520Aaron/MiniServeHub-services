import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserWx } from '@/entity/userWx.entity';
import {
  WechatLoginDto,
  WechatEncryptedDataDto,
  WechatUserProfileResponseDto,
} from '@/dto/userBases.dto';
import { MiniAppLoginResponseDto, MiniAppUserInfoResponseDto } from '@/dto/miniapp.dto';
import { HttpClientService } from '@/common/http/http-client.service';

interface IWechatSessionResp {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class MiniAppService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(UserWx) private readonly userWxRepo: Repository<UserWx>,
    private readonly http: HttpClientService,
  ) {}

  public async register(dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(dto);
    const exists = await this.userWxRepo.findOne({ where: { openid } });
    if (exists) {
      exists.sessionKey = sessionKey;
      exists.unionid = unionid || exists.unionid;
      exists.lastLoginAt = new Date();
      this.applyOptionalProfile(exists, dto);
      await this.userWxRepo.save(exists);
      return { openid, token: await this.signToken(openid, exists.userId ?? undefined) };
    }

    const created = this.userWxRepo.create({
      openid,
      unionid: unionid || null,
      sessionKey,
      status: 1,
      lastLoginAt: new Date(),
      nickname: dto.nickname ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      gender: typeof dto.gender === 'number' ? dto.gender : null,
      country: dto.country ?? null,
      province: dto.province ?? null,
      city: dto.city ?? null,
      language: dto.language ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      userId: typeof dto.userId === 'number' ? dto.userId : null,
    });
    await this.userWxRepo.save(created);
    return { openid, token: await this.signToken(openid, created.userId ?? undefined) };
  }

  public async login(dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(dto);
    const user = await this.userWxRepo.findOne({ where: { openid } });
    if (!user) throw new UnauthorizedException('用户不存在，请先注册');
    user.sessionKey = sessionKey;
    user.unionid = unionid || user.unionid;
    user.lastLoginAt = new Date();
    this.applyOptionalProfile(user, dto);
    await this.userWxRepo.save(user);
    return { openid, token: await this.signToken(openid, user.userId ?? undefined) };
  }

  public async loginOrRegister(dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(dto);
    let user = await this.userWxRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userWxRepo.create({
        openid,
        unionid: unionid || null,
        sessionKey,
        status: 1,
        lastLoginAt: new Date(),
        nickname: dto.nickname ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        gender: typeof dto.gender === 'number' ? dto.gender : null,
        country: dto.country ?? null,
        province: dto.province ?? null,
        city: dto.city ?? null,
        language: dto.language ?? null,
        phoneNumber: dto.phoneNumber ?? null,
        userId: typeof dto.userId === 'number' ? dto.userId : null,
      });
    } else {
      user.sessionKey = sessionKey;
      user.unionid = unionid || user.unionid;
      user.lastLoginAt = new Date();
      this.applyOptionalProfile(user, dto);
    }
    await this.userWxRepo.save(user);
    return { openid, token: await this.signToken(openid, user.userId ?? undefined) };
  }

  public async decryptUserInfo(dto: WechatEncryptedDataDto): Promise<WechatUserProfileResponseDto> {
    const { openid, encryptedData, iv } = dto;
    const user = await this.userWxRepo.findOne({ where: { openid } });
    if (!user || !user.sessionKey)
      throw new UnauthorizedException('会话不存在或已过期，请重新登录');

    const sessionKeyBuf = Buffer.from(user.sessionKey, 'base64');
    const encryptedBuf = Buffer.from(encryptedData, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');

    const { createDecipheriv } = await import('node:crypto');
    const decipher = createDecipheriv('aes-128-cbc', sessionKeyBuf, ivBuf);
    const decoded = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]).toString(
      'utf8',
    );
    const data = JSON.parse(decoded) as {
      nickName?: string;
      avatarUrl?: string;
      gender?: number;
      country?: string;
      province?: string;
      city?: string;
      language?: string;
      unionId?: string;
    };

    user.nickname = data.nickName ?? user.nickname;
    user.avatarUrl = data.avatarUrl ?? user.avatarUrl;
    if (typeof data.gender === 'number') user.gender = data.gender;
    user.country = data.country ?? user.country;
    user.province = data.province ?? user.province;
    user.city = data.city ?? user.city;
    user.language = data.language ?? user.language;
    user.unionid = data.unionId ?? user.unionid;
    await this.userWxRepo.save(user);

    return {
      nickname: user.nickname ?? null,
      avatarUrl: user.avatarUrl ?? null,
      gender: typeof user.gender === 'number' ? user.gender : null,
      country: user.country ?? null,
      province: user.province ?? null,
      city: user.city ?? null,
      language: user.language ?? null,
    };
  }

  public async getUserInfo(openid: string): Promise<MiniAppUserInfoResponseDto> {
    const user = await this.userWxRepo.findOne({ where: { openid } });
    if (!user) throw new BadRequestException('用户不存在');
    return {
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      country: user.country,
      province: user.province,
      city: user.city,
      language: user.language,
      phoneNumber: user.phoneNumber,
      userId: user.userId,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async signToken(openid: string, userId?: number): Promise<string> {
    const payload = { sub: openid, openid, userId };
    const secret = this.config.get<string>('JWT_SECRET') || 'dev-secret-change-me';
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '1h';
    return await this.jwt.signAsync(payload, { secret, expiresIn });
  }

  private applyOptionalProfile(userWx: UserWx, dto: WechatLoginDto): void {
    if (typeof dto.userId === 'number') userWx.userId = dto.userId;
    if (typeof dto.gender === 'number') userWx.gender = dto.gender;
    if (dto.nickname !== undefined) userWx.nickname = dto.nickname ?? null;
    if (dto.avatarUrl !== undefined) userWx.avatarUrl = dto.avatarUrl ?? null;
    if (dto.country !== undefined) userWx.country = dto.country ?? null;
    if (dto.province !== undefined) userWx.province = dto.province ?? null;
    if (dto.city !== undefined) userWx.city = dto.city ?? null;
    if (dto.language !== undefined) userWx.language = dto.language ?? null;
    if (dto.phoneNumber !== undefined) userWx.phoneNumber = dto.phoneNumber ?? null;
  }

  private async getWechatSessionByCode(
    dto: WechatLoginDto,
  ): Promise<{ openid: string; sessionKey: string; unionid: string | undefined }> {
    const code = dto.code?.trim();
    if (!code) throw new UnauthorizedException('code不能为空');

    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');
    if (!appid || !secret) throw new BadRequestException('服务端缺少微信配置 WX_APPID/WX_SECRET');

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(
      secret,
    )}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;

    const data = await this.http.getJson<IWechatSessionResp>(url, { timeoutMs: 3000, retry: 1 });
    if (data.errcode) throw new BadRequestException(`微信接口错误: ${data.errmsg || data.errcode}`);
    const { openid, session_key: sessionKey, unionid } = data;
    return { openid, sessionKey, unionid };
  }
}
