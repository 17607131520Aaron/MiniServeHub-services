import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MiniAppService } from '@/services/miniapp.service';
import { WechatLoginDto, WechatEncryptedDataDto, WechatUserProfileResponseDto } from '@/dto/userBases.dto';
import { MiniAppLoginResponseDto, MiniAppUserInfoResponseDto } from '@/dto/miniapp.dto';

@ApiTags('MiniApp')
@Controller('miniapp')
export class MiniAppController {
  constructor(private readonly miniapp: MiniAppService) {}

  @Post('register')
  @ApiOperation({ summary: '小程序注册（不存在即创建，存在则仅更新资料与会话）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: MiniAppLoginResponseDto })
  public async register(@Body() dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    return await this.miniapp.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '小程序登录（仅登录，未注册会报错）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: MiniAppLoginResponseDto })
  public async login(@Body() dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    return await this.miniapp.login(dto);
  }

  @Post('loginOrRegister')
  @ApiOperation({ summary: '小程序一键登录（存在即登录，不存在自动注册）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: MiniAppLoginResponseDto })
  public async loginOrRegister(@Body() dto: WechatLoginDto): Promise<MiniAppLoginResponseDto> {
    return await this.miniapp.loginOrRegister(dto);
  }

  @Post('decryptUserInfo')
  @ApiOperation({ summary: '解密微信用户信息（encryptedData + iv）' })
  @ApiBody({ type: WechatEncryptedDataDto })
  @ApiOkResponse({ type: WechatUserProfileResponseDto })
  public async decryptUserInfo(@Body() dto: WechatEncryptedDataDto): Promise<WechatUserProfileResponseDto> {
    return await this.miniapp.decryptUserInfo(dto);
  }

  @Get('userinfo/:openid')
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询用户信息（需 Bearer Token）' })
  @ApiOkResponse({ type: MiniAppUserInfoResponseDto })
  public async getUserInfo(@Param('openid') openid: string): Promise<MiniAppUserInfoResponseDto> {
    return await this.miniapp.getUserInfo(openid);
  }
}

