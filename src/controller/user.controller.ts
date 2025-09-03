import { Controller, Get, Post, Inject, Body } from '@nestjs/common';
import type { UserInfoServiceImpl } from '@/services/user.services';
import { UserInfoResponseDto, UserInfoDto } from '@/dto/userinfo.dto';

@Controller('userinfo')
export class UserController {
  constructor(@Inject('IUserInfoService') private readonly userinfoService: UserInfoServiceImpl) {}

  @Get('getUserInfo')
  public async getUserInfo(): Promise<UserInfoResponseDto> {
    return await this.userinfoService.getUserInfo();
  }

  @Post('userLogin')
  public async userLogin(@Body() userInfoDto: UserInfoDto): Promise<string> {
    return await this.userinfoService.userLogin(userInfoDto);
  }

  @Post('registerUser')
  public async registerUser(): Promise<string> {
    return await this.userinfoService.registerUser();
  }
}
