import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInfoResponseDto, UserInfoDto } from '@/dto/userinfo.dto';
import { User } from '@/entity/user.entity';

@Injectable()
export class UserInfoServiceImpl {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  public async validateUserAndSignToken(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { username, status: 1 } });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isHashMatch = await bcrypt.compare(password, user.password);
    if (!isHashMatch) {
      if (user.password === password) {
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        await this.userRepository.save(user);
      } else {
        throw new UnauthorizedException('用户名或密码错误');
      }
    }

    const payload = { sub: user.id, username: user.username };
    const token = await this.jwtService.signAsync(payload);
    return token;
  }

  public async getUserInfo(): Promise<UserInfoResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { username: 'admin' },
      });

      if (user) {
        return {
          username: user.username,
          password: user.password,
        };
      }

      return {
        username: 'admin',
        password: '123456',
      };
    } catch (error) {
      throw new BadRequestException('获取用户信息失败: ' + (error as Error).message);
    }
  }

  public async registerUser(): Promise<string> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { username: 'admin' },
      });

      if (existingUser) {
        return '用户已存在';
      }

      const hashed = await bcrypt.hash('123456', 10);
      const newUser = this.userRepository.create({
        username: 'admin',
        password: hashed,
        email: 'admin@example.com',
        status: 1,
      });

      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (error) {
      throw new BadRequestException('注册失败: ' + (error as Error).message);
    }
  }

  public async userLogin(userInfoDto: UserInfoDto): Promise<string> {
    try {
      const user = await this.userRepository.findOne({
        where: { username: userInfoDto.username, status: 1 },
      });
      if (!user) return '用户名或密码错误';
      const ok = await bcrypt.compare(userInfoDto.password, user.password);
      if (ok) {
        const token = await this.validateUserAndSignToken(
          userInfoDto.username,
          userInfoDto.password,
        );
        return token;
      }
      return '用户名或密码错误';
    } catch (error) {
      throw new BadRequestException('登录失败: ' + (error as Error).message);
    }
  }
}
