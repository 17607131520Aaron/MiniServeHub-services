import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { UserBasesServices } from '@/services/userBases.services';
import {
  WechatLoginDto,
  WechatLoginResponseDto,
  WechatEncryptedDataDto,
  WechatUserProfileResponseDto,
} from '@/dto/userBases.dto';

@ApiTags('WeChat Mini Program')
@Controller('userBases')
export class UserBaseController {
  constructor(private readonly UserBasesServices: UserBasesServices) {}

  /**
   * 小程序用户登录接口
   */
  @Post('miniProgramLogin')
  @ApiOperation({ summary: '小程序一键登录（存在则登录，不存在自动注册）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: WechatLoginResponseDto })
  public async miniProgramLogin(
    @Body() WechatLoginDto: WechatLoginDto,
  ): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramLogin(WechatLoginDto);
  }

  /**
   * 小程序用户注册
   */
  @Post('miniProgram/register')
  @ApiOperation({ summary: '小程序注册（不存在即创建，存在则仅更新资料与会话）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: WechatLoginResponseDto })
  public async miniProgramRegister(@Body() dto: WechatLoginDto): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramRegister(dto);
  }

  /**
   * 小程序用户登录（仅登录，未注册则报错）
   */
  @Post('miniProgram/login')
  @ApiOperation({ summary: '小程序登录（仅登录，未注册会报错）' })
  @ApiBody({ type: WechatLoginDto })
  @ApiOkResponse({ type: WechatLoginResponseDto })
  public async miniProgramLoginExisting(
    @Body() dto: WechatLoginDto,
  ): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramLoginExisting(dto);
  }

  /**
   * 解密微信用户信息（登录后调用一次）
   */
  @Post('miniProgram/decryptUserInfo')
  @ApiOperation({ summary: '解密微信用户信息（encryptedData + iv）' })
  @ApiBody({ type: WechatEncryptedDataDto })
  @ApiOkResponse({ type: WechatUserProfileResponseDto })
  public async decryptUserInfo(
    @Body() dto: WechatEncryptedDataDto,
  ): Promise<WechatUserProfileResponseDto> {
    return await this.UserBasesServices.decryptAndUpdateProfile(dto);
  }
}
