import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import { UserInfoResponseDto, UserInfoDto } from '@/dto/userinfo.dto';
import { User } from '@/entity/user.entity';
import type { IRedisService } from '@/interface/redis.interface';
import { BaseEnterpriseLoginService } from '@/common/base';

@Injectable()
export class UserInfoServiceImpl extends BaseEnterpriseLoginService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    jwtService: JwtService,
    @Inject('IRedisService')
    redisService: IRedisService,
  ) {
    super(redisService, jwtService);
  }

  public async validateUserAndSignToken(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { username, status: 1 } });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isHashMatch = await bcrypt.compare(password, user.password);
    if (!isHashMatch) {
      // 如果密码不匹配，检查是否是明文密码（用于首次登录或测试）
      if (user.password === password) {
        // 将明文密码转换为哈希密码
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        await this.userRepository.save(user);
      } else {
        throw new UnauthorizedException('用户名或密码错误');
      }
    }

    const payload = {
      sub: user.id,
      username: user.username,
      hash: createHash('sha256').update(user.password).digest('hex').substring(0, 16), // 密码哈希的16位摘要
      timestamp: Date.now(), // 当前时间戳
      nonce: Math.random().toString(36).substring(2, 15), // 随机字符串增加唯一性
    };

    const token = await this.jwtService.signAsync(payload);

    // 将 token 存储到 Redis 中
    await this.storeTokenInRedis(token, user.id, username);

    return token;
  }

  public async userLogin(userInfoDto: UserInfoDto): Promise<string> {
    if (!userInfoDto.username || !userInfoDto.password) {
      throw new BadRequestException('用户名或密码不能为空');
    }

    try {
      const token = await this.validateUserAndSignToken(userInfoDto.username, userInfoDto.password);
      return token;
    } catch (error) {
      throw new BadRequestException('登录失败: ' + (error as Error).message);
    }
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

  /**
   * 验证 token 是否有效（检查是否在 Redis 中存在且未被拉黑）
   */
  public async validateToken(token: string): Promise<boolean> {
    try {
      // 1. 检查 token 是否在黑名单中
      const isBlacklisted = await this.redisService.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        return false;
      }

      // 2. 验证 JWT 签名
      const payload = await this.jwtService.verifyAsync(token);

      // 3. 检查 token 是否在 Redis 中存在
      const tokenKey = `token:${payload.sub}:${payload.username}`;
      const exists = await this.redisService.exists(tokenKey);

      if (exists) {
        // 更新最后活跃时间
        const sessionKey = `session:${payload.sub}`;
        const sessionData = await this.redisService.get(sessionKey);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.lastActive = Date.now();
          await this.redisService.set(sessionKey, JSON.stringify(session), 24 * 60 * 60);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 注销用户（将 token 加入黑名单）
   */
  public async logout(token: string): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      // 1. 将 token 加入黑名单
      await this.redisService.set(`blacklist:${token}`, '1', 24 * 60 * 60);

      // 2. 从用户活跃 token 列表中移除
      const userTokensKey = `user_tokens:${payload.sub}`;
      await this.redisService.srem(userTokensKey, token);

      // 3. 删除当前 token
      const tokenKey = `token:${payload.sub}:${payload.username}`;
      await this.redisService.del(tokenKey);

      // 4. 记录注销历史
      const loginHistoryKey = `login_history:${payload.sub}`;
      const logoutRecord = {
        timestamp: Date.now(),
        action: 'logout',
        token: token.substring(0, 20) + '...',
      };
      await this.redisService.lpush(loginHistoryKey, JSON.stringify(logoutRecord));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取用户会话信息
   */
  public async getUserSession(userId: number): Promise<Record<string, unknown> | null> {
    try {
      const sessionKey = `session:${userId}`;
      const sessionData = await this.redisService.get(sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch {
      return null;
    }
  }

  /**
   * 强制下线用户（清除所有活跃会话）
   */
  public async forceLogout(userId: number): Promise<boolean> {
    try {
      const userTokensKey = `user_tokens:${userId}`;
      const tokens = await this.redisService.smembers(userTokensKey);

      // 将所有 token 加入黑名单
      for (const token of tokens) {
        await this.redisService.set(`blacklist:${token}`, '1', 24 * 60 * 60);
      }

      // 清除用户相关数据
      await this.redisService.del(userTokensKey);
      await this.redisService.del(`session:${userId}`);
      await this.redisService.del(`online:${userId}`);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 实现抽象方法：执行用户特定的登录后逻辑
   */
  protected async executeCustomLoginLogic(
    userId: number,
    username: string,
    _token: string,
    _additionalData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // 用户特定的登录后逻辑
      this.logger.log(`执行用户 ${username} 特定的登录后逻辑`);

      // 例如：更新用户最后登录时间到数据库
      await this.userRepository.update(userId, {
        lastLoginAt: new Date(),
        loginCount: () => 'login_count + 1',
        status: 1, // 确保用户状态为活跃
      });

      // 可以添加其他用户特定的逻辑
      // 例如：发送欢迎消息、检查用户偏好设置等
    } catch (error) {
      this.logger.error(`执行用户特定登录逻辑失败: ${error.message}`);
    }
  }

  /**
   * 实现抽象方法：加载用户特定的权限
   */
  protected async loadUserSpecificPermissions(userId: number): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    try {
      // 从数据库加载用户权限（这里简化处理）
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (user) {
        // 根据用户信息返回相应的权限
        // 实际应用中应该从权限表或角色表查询
        return {
          roles: ['user', 'authenticated'],
          permissions: ['read', 'write', 'profile_update'],
        };
      }

      // 默认权限
      return {
        roles: ['guest'],
        permissions: ['read'],
      };
    } catch (error) {
      this.logger.error(`加载用户权限失败: ${error.message}`);
      // 返回默认权限
      return {
        roles: ['guest'],
        permissions: ['read'],
      };
    }
  }

  /**
   * 重写权限更新方法，使用用户特定的权限
   */
  protected async updateUserPermissions(userId: number): Promise<void> {
    try {
      // 加载用户特定的权限
      const permissions = await this.loadUserSpecificPermissions(userId);

      // 存储用户权限到 Redis 缓存
      await this.redisService.set(
        `user_permissions:${userId}`,
        JSON.stringify({
          ...permissions,
          lastUpdated: Date.now(),
        }),
        60 * 60,
      ); // 1小时过期

      await this.redisService.set(
        `user_roles:${userId}`,
        JSON.stringify(permissions.roles),
        60 * 60,
      );

      this.logger.log(`用户 ${userId} 特定权限已更新`);
    } catch (error) {
      this.logger.error(`更新用户特定权限失败: ${error.message}`);
    }
  }

  /**
   * 将 token 存储到 Redis 中
   */
  private async storeTokenInRedis(token: string, userId: number, username: string): Promise<void> {
    try {
      const tokenKey = `token:${userId}:${username}`;
      const sessionKey = `session:${userId}`;
      const userTokensKey = `user_tokens:${userId}`;

      // 1. 存储当前 token，设置过期时间（24小时）
      await this.redisService.set(tokenKey, token, 24 * 60 * 60);

      // 2. 存储用户会话信息
      const sessionData = {
        userId,
        username,
        loginTime: Date.now(),
        lastActive: Date.now(),
        ip: '127.0.0.1', // 可以从请求中获取真实IP
        userAgent: 'Unknown', // 可以从请求中获取User-Agent
      };
      await this.redisService.set(sessionKey, JSON.stringify(sessionData), 24 * 60 * 60);

      // 3. 将 token 添加到用户的活跃 token 列表中
      await this.redisService.sadd(userTokensKey, token);
      await this.redisService.expire(userTokensKey, 24 * 60 * 60);

      // 4. 记录用户登录历史（用于审计）
      const loginHistoryKey = `login_history:${userId}`;
      const loginRecord = {
        timestamp: Date.now(),
        action: 'login',
        token: token.substring(0, 20) + '...', // 只记录部分token用于追踪
        ip: '127.0.0.1',
      };
      await this.redisService.lpush(loginHistoryKey, JSON.stringify(loginRecord));
      await this.redisService.ltrim(loginHistoryKey, 0, 99); // 只保留最近100条记录
      await this.redisService.expire(loginHistoryKey, 30 * 24 * 60 * 60); // 30天过期

      // 5. 更新用户在线状态
      await this.redisService.set(`online:${userId}`, '1', 24 * 60 * 60);

      // 6. 执行企业级登录后流程
      await this.executeEnterpriseLoginFlow(userId, username, token, {
        ip: '127.0.0.1',
        userAgent: 'Unknown',
        location: 'Unknown',
      });
    } catch (error) {
      // 如果 Redis 存储失败，记录日志但不影响登录流程
      console.error('Token Redis 存储失败:', error);
    }
  }
}
