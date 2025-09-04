import { Controller, Post, Body } from '@nestjs/common';
import { UserBasesServices } from '@/services/userBases.services';
import { WechatLoginDto, WechatLoginResponseDto } from '@/dto/userBases.dto';

@Controller('userBases')
export class UserBaseController {
  constructor(private readonly UserBasesServices: UserBasesServices) {}

  /**
   * 小程序用户登录接口
   */
  @Post('miniProgramLogin')
  public async miniProgramLogin(
    @Body() WechatLoginDto: WechatLoginDto,
  ): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramLogin(WechatLoginDto);
  }

  /**
   * 小程序用户注册
   */
  @Post('miniProgram/register')
  public async miniProgramRegister(@Body() dto: WechatLoginDto): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramRegister(dto);
  }

  /**
   * 小程序用户登录（仅登录，未注册则报错）
   */
  @Post('miniProgram/login')
  public async miniProgramLoginExisting(
    @Body() dto: WechatLoginDto,
  ): Promise<WechatLoginResponseDto> {
    return await this.UserBasesServices.miniProgramLoginExisting(dto);
  }
}
