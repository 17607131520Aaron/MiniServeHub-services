import { WechatLoginDto, WechatLoginResponseDto } from '@/dto/userBases.dto';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWx } from '@/entity/userWx.entity';
import https from 'node:https';

interface IWechatSessionResp {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class UserBasesServices {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserWx)
    private readonly userWxRepository: Repository<UserWx>,
  ) {}

  public async miniProgramRegister(loginDto: WechatLoginDto): Promise<WechatLoginResponseDto> {
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(loginDto);
    const exists = await this.userWxRepository.findOne({ where: { openid } });
    if (exists) {
      // 已存在则仅更新 session 与时间并返回
      exists.sessionKey = sessionKey;
      exists.unionid = unionid || exists.unionid;
      exists.lastLoginAt = new Date();
      // 如果传了用户资料则更新
      this.applyOptionalProfile(exists, loginDto);
      await this.userWxRepository.save(exists);
      return { openid, session_key: sessionKey };
    }

    const created = this.userWxRepository.create({
      openid,
      unionid: unionid || null,
      sessionKey,
      status: 1,
      lastLoginAt: new Date(),
      // 资料
      nickname: loginDto.nickname ?? null,
      avatarUrl: loginDto.avatarUrl ?? null,
      gender: typeof loginDto.gender === 'number' ? loginDto.gender : null,
      country: loginDto.country ?? null,
      province: loginDto.province ?? null,
      city: loginDto.city ?? null,
      language: loginDto.language ?? null,
      phoneNumber: loginDto.phoneNumber ?? null,
      userId: typeof loginDto.userId === 'number' ? loginDto.userId : null,
    });
    await this.userWxRepository.save(created);
    return { openid, session_key: sessionKey };
  }

  public async miniProgramLoginExisting(loginDto: WechatLoginDto): Promise<WechatLoginResponseDto> {
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(loginDto);
    const userWx = await this.userWxRepository.findOne({ where: { openid } });
    if (!userWx) {
      throw new UnauthorizedException('用户不存在，请先注册');
    }
    userWx.sessionKey = sessionKey;
    userWx.unionid = unionid || userWx.unionid;
    userWx.lastLoginAt = new Date();
    this.applyOptionalProfile(userWx, loginDto);
    await this.userWxRepository.save(userWx);
    return { openid, session_key: sessionKey };
  }

  public async miniProgramLogin(loginDto: WechatLoginDto): Promise<WechatLoginResponseDto> {
    // 为兼容旧接口：存在则登录，不存在则自动注册
    const { openid, sessionKey, unionid } = await this.getWechatSessionByCode(loginDto);
    let userWx = await this.userWxRepository.findOne({ where: { openid } });
    if (!userWx) {
      userWx = this.userWxRepository.create({
        openid,
        unionid: unionid || null,
        sessionKey,
        status: 1,
        lastLoginAt: new Date(),
        nickname: loginDto.nickname ?? null,
        avatarUrl: loginDto.avatarUrl ?? null,
        gender: typeof loginDto.gender === 'number' ? loginDto.gender : null,
        country: loginDto.country ?? null,
        province: loginDto.province ?? null,
        city: loginDto.city ?? null,
        language: loginDto.language ?? null,
        phoneNumber: loginDto.phoneNumber ?? null,
        userId: typeof loginDto.userId === 'number' ? loginDto.userId : null,
      });
    } else {
      userWx.sessionKey = sessionKey;
      userWx.unionid = unionid || userWx.unionid;
      userWx.lastLoginAt = new Date();
      this.applyOptionalProfile(userWx, loginDto);
    }
    await this.userWxRepository.save(userWx);
    return { openid, session_key: sessionKey };
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
    loginDto: WechatLoginDto,
  ): Promise<{ openid: string; sessionKey: string; unionid: string | undefined }> {
    const { code } = loginDto;
    if (!code) {
      throw new UnauthorizedException('code不能为空');
    }

    const appid = this.configService.get<string>('WX_APPID');
    const secret = this.configService.get<string>('WX_SECRET');
    if (!appid || !secret) {
      throw new BadRequestException('服务端缺少微信配置 WX_APPID/WX_SECRET');
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(
      appid,
    )}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(
      code,
    )}&grant_type=authorization_code`;

    const data = await this.fetchJson<IWechatSessionResp>(url);
    if (data.errcode) {
      throw new BadRequestException(`微信接口错误: ${data.errmsg || data.errcode}`);
    }
    const { openid, session_key: sessionKey, unionid } = data;
    return { openid, sessionKey, unionid };
  }

  private fetchJson<T = unknown>(url: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      https
        .get(url, (res) => {
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (d: Buffer) => chunks.push(d));
          res.on('end', () => {
            try {
              const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
              resolve(json);
            } catch (e) {
              reject(e as Error);
            }
          });
        })
        .on('error', (err: Error) => reject(err))
        .end();
    });
  }
}
