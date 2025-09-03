import { Controller, Get, Post, Inject, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { UserInfoServiceImpl } from '@/services/user.services';
import { UserInfoResponseDto, UserInfoDto } from '@/dto/userinfo.dto';

@ApiTags('userinfo')
@Controller('userinfo')
@Controller('userinfo')
export class UserController {
  constructor(@Inject('IUserInfoService') private readonly userinfoService: UserInfoServiceImpl) {}

  @Get('getUserInfo')
  public async getUserInfo(): Promise<UserInfoResponseDto> {
    return await this.userinfoService.getUserInfo();
  }

  @Post('userLogin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录并签发JWT' })
  public async userLogin(@Body() userInfoDto: UserInfoDto): Promise<string> {
    return await this.userinfoService.userLogin(userInfoDto);
  }

  @Post('registerUser')
  public async registerUser(): Promise<string> {
    return await this.userinfoService.registerUser();
  }
}

// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   @Post('login')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: '用户登录并签发JWT' })
//   public async login(@Body() body: LoginDto): Promise<{ token: string }> {
//     const { username, password } = body;
//     return await this.authService.validateUserAndSignToken(username, password);
//   }
// }
