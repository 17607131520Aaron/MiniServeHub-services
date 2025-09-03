import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IRedisService } from '@/interface/redis.interface';

/**
 * 登录后流程的抽象基类
 * 提供完整的登录后处理流程，包括安全审计、状态更新、合规性检查等
 */
@Injectable()
export abstract class BaseEnterpriseLoginService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly redisService: IRedisService,
    protected readonly jwtService: JwtService,
  ) {}

  /**
   * 执行登录后的完整流程
   * @param userId 用户ID
   * @param username 用户名
   * @param token 生成的JWT token
   * @param additionalData 额外的登录数据（如IP、User-Agent等）
   */
  public async executeEnterpriseLoginFlow(
    userId: number,
    username: string,
    token: string,
    additionalData?: {
      ip?: string;
      userAgent?: string;
      location?: string;
      deviceInfo?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      this.logger.log(`开始执行用户 ${username} 的登录流程`);

      // 1. 更新用户登录状态
      await this.updateUserLoginStatus(userId, additionalData);

      // 2. 记录安全审计日志
      await this.logSecurityEvent(userId, username, 'login_success', {
        ip: additionalData?.ip || '127.0.0.1',
        userAgent: additionalData?.userAgent || 'Unknown',
        location: additionalData?.location || 'Unknown',
        deviceInfo: additionalData?.deviceInfo || {},
        timestamp: Date.now(),
        token: token.substring(0, 20) + '...',
      });

      // 3. 检查异常登录行为
      await this.detectAnomalousLogin(userId, username, additionalData);

      // 4. 发送登录通知（可选）
      await this.sendLoginNotification(userId, username, additionalData);

      // 5. 更新用户权限和角色信息
      await this.updateUserPermissions(userId);

      // 6. 检查合规性要求
      await this.checkComplianceRequirements(userId, username);

      // 7. 记录登录统计信息
      await this.updateLoginStatistics(userId, username);

      // 8. 执行子类特定的登录后逻辑
      await this.executeCustomLoginLogic(userId, username, token, additionalData);

      this.logger.log(`用户 ${username} 的企业级登录流程执行完成`);
    } catch (error) {
      this.logger.error(`企业级登录流程执行失败: ${error.message}`, error.stack);
      // 不影响主要登录流程
    }
  }

  /**
   * 更新用户登录状态
   * @param userId 用户ID
   * @param additionalData 额外数据
   */
  protected async updateUserLoginStatus(
    userId: number,
    additionalData?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    try {
      // 更新 Redis 中的用户状态
      await this.redisService.set(`user_status:${userId}`, 'active', 24 * 60 * 60);
      await this.redisService.set(`last_login:${userId}`, Date.now().toString(), 24 * 60 * 60);

      // 记录登录设备信息
      if (additionalData?.ip) {
        await this.redisService.set(`last_ip:${userId}`, additionalData.ip, 24 * 60 * 60);
      }
      if (additionalData?.userAgent) {
        await this.redisService.set(
          `last_user_agent:${userId}`,
          additionalData.userAgent,
          24 * 60 * 60,
        );
      }

      this.logger.log(`用户 ${userId} 登录状态已更新`);
    } catch (error) {
      this.logger.error(`更新用户登录状态失败: ${error.message}`);
    }
  }

  /**
   * 记录安全审计日志
   * @param userId 用户ID
   * @param username 用户名
   * @param eventType 事件类型
   * @param details 事件详情
   */
  protected async logSecurityEvent(
    userId: number,
    username: string,
    eventType: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const auditLog = {
        userId,
        username,
        eventType,
        details,
        timestamp: Date.now(),
        severity: this.getEventSeverity(eventType),
      };

      // 存储到 Redis 审计日志
      const auditKey = `audit_log:${userId}`;
      await this.redisService.lpush(auditKey, JSON.stringify(auditLog));
      await this.redisService.ltrim(auditKey, 0, 999); // 保留最近1000条记录
      await this.redisService.expire(auditKey, 365 * 24 * 60 * 60); // 1年过期

      // 存储到全局审计日志
      const globalAuditKey = 'global_audit_log';
      await this.redisService.lpush(globalAuditKey, JSON.stringify(auditLog));
      await this.redisService.ltrim(globalAuditKey, 0, 9999); // 保留最近10000条记录

      // 如果是高风险事件，立即记录
      if (auditLog.severity === 'high') {
        await this.redisService.lpush('high_risk_events', JSON.stringify(auditLog));
        await this.redisService.ltrim('high_risk_events', 0, 99);
      }

      this.logger.log(`安全事件已记录: ${eventType} for user ${username}`);
    } catch (error) {
      this.logger.error(`记录安全审计日志失败: ${error.message}`);
    }
  }

  /**
   * 获取事件严重程度
   * @param eventType 事件类型
   * @returns 严重程度
   */
  protected getEventSeverity(eventType: string): 'low' | 'medium' | 'high' {
    const highRiskEvents = ['login_failed', 'unauthorized_access', 'suspicious_activity'];
    const mediumRiskEvents = ['password_change', 'permission_change', 'unusual_login_time'];

    if (highRiskEvents.includes(eventType)) return 'high';
    if (mediumRiskEvents.includes(eventType)) return 'medium';
    return 'low';
  }

  /**
   * 检测异常登录行为
   * @param userId 用户ID
   * @param username 用户名
   * @param additionalData 额外数据
   */
  protected async detectAnomalousLogin(
    userId: number,
    username: string,
    additionalData?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    try {
      const currentTime = Date.now();
      const currentHour = new Date().getHours();

      // 检查是否在非工作时间登录
      if (currentHour < 6 || currentHour > 22) {
        await this.logSecurityEvent(userId, username, 'unusual_login_time', {
          hour: currentHour,
          timestamp: currentTime,
        });
      }

      // 检查登录频率
      const recentLogins = await this.redisService.lrange(`login_history:${userId}`, 0, 4);
      if (recentLogins.length >= 3) {
        const recentLoginTimes = recentLogins.map((login) => JSON.parse(login).timestamp);
        const timeDiff = currentTime - recentLoginTimes[recentLoginTimes.length - 1];

        // 如果5分钟内登录超过3次，记录异常
        if (timeDiff < 5 * 60 * 1000) {
          await this.logSecurityEvent(userId, username, 'frequent_login_attempts', {
            attempts: recentLogins.length,
            timeWindow: '5 minutes',
          });
        }
      }

      // 检查IP地址变化
      if (additionalData?.ip) {
        const lastLoginIP = await this.redisService.get(`last_ip:${userId}`);

        if (lastLoginIP && lastLoginIP !== additionalData.ip) {
          await this.logSecurityEvent(userId, username, 'ip_address_change', {
            previousIP: lastLoginIP,
            currentIP: additionalData.ip,
            timestamp: currentTime,
          });
        }
      }

      this.logger.log(`异常登录检测完成 for user ${username}`);
    } catch (error) {
      this.logger.error(`检测异常登录行为失败: ${error.message}`);
    }
  }

  /**
   * 发送登录通知
   * @param userId 用户ID
   * @param username 用户名
   * @param additionalData 额外数据
   */
  protected async sendLoginNotification(
    userId: number,
    username: string,
    additionalData?: { ip?: string; userAgent?: string; location?: string },
  ): Promise<void> {
    try {
      // 检查用户是否启用了登录通知
      const notificationEnabled = await this.redisService.get(`notification_enabled:${userId}`);

      if (notificationEnabled === 'true') {
        const notification = {
          userId,
          username,
          type: 'login_notification',
          message: `用户 ${username} 已成功登录系统`,
          timestamp: Date.now(),
          details: {
            ip: additionalData?.ip || '127.0.0.1',
            userAgent: additionalData?.userAgent || 'Unknown',
            location: additionalData?.location || 'Unknown',
          },
        };

        // 存储通知到队列（可以后续发送邮件、短信等）
        await this.redisService.lpush('notification_queue', JSON.stringify(notification));

        // 记录通知发送状态
        await this.redisService.set(
          `notification_sent:${userId}:${Date.now()}`,
          'pending',
          24 * 60 * 60,
        );

        this.logger.log(`登录通知已发送 for user ${username}`);
      }
    } catch (error) {
      this.logger.error(`发送登录通知失败: ${error.message}`);
    }
  }

  /**
   * 更新用户权限和角色信息
   * @param userId 用户ID
   */
  protected async updateUserPermissions(userId: number): Promise<void> {
    try {
      // 存储用户权限到 Redis 缓存（子类可以重写此方法）
      const permissions = {
        roles: ['user'], // 默认角色，子类可以重写
        permissions: ['read', 'write'], // 默认权限，子类可以重写
        lastUpdated: Date.now(),
      };

      await this.redisService.set(
        `user_permissions:${userId}`,
        JSON.stringify(permissions),
        60 * 60,
      ); // 1小时过期
      await this.redisService.set(
        `user_roles:${userId}`,
        JSON.stringify(permissions.roles),
        60 * 60,
      );

      this.logger.log(`用户 ${userId} 权限已更新`);
    } catch (error) {
      this.logger.error(`更新用户权限失败: ${error.message}`);
    }
  }

  /**
   * 检查合规性要求
   * @param userId 用户ID
   * @param username 用户名
   */
  protected async checkComplianceRequirements(userId: number, username: string): Promise<void> {
    try {
      // 检查登录失败次数
      const failedAttempts = await this.redisService.get(`failed_attempts:${userId}`);
      if (failedAttempts && parseInt(failedAttempts) > 5) {
        await this.logSecurityEvent(userId, username, 'multiple_failed_attempts', {
          failedCount: parseInt(failedAttempts),
          timestamp: Date.now(),
        });
      }

      this.logger.log(`合规性检查完成 for user ${username}`);
    } catch (error) {
      this.logger.error(`检查合规性要求失败: ${error.message}`);
    }
  }

  /**
   * 更新登录统计信息
   * @param userId 用户ID
   * @param username 用户名
   */
  protected async updateLoginStatistics(userId: number, username: string): Promise<void> {
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // 更新每日登录统计
      const dailyStatsKey = `daily_stats:${currentDate}`;
      await this.redisService.hincrby(dailyStatsKey, 'total_logins', 1);
      await this.redisService.hincrby(dailyStatsKey, `user_${userId}`, 1);
      await this.redisService.expire(dailyStatsKey, 7 * 24 * 60 * 60); // 7天过期

      // 更新用户登录统计
      const userStatsKey = `user_stats:${userId}`;
      const userStats = await this.redisService.get(userStatsKey);
      const stats = userStats ? JSON.parse(userStats) : { totalLogins: 0, lastLogin: null };

      stats.totalLogins += 1;
      stats.lastLogin = Date.now();
      stats.loginStreak = (stats.loginStreak || 0) + 1;

      await this.redisService.set(userStatsKey, JSON.stringify(stats), 30 * 24 * 60 * 60); // 30天过期

      // 更新全局统计
      await this.redisService.incr('global_total_logins');
      await this.redisService.incr('global_daily_logins');
      await this.redisService.expire('global_daily_logins', 24 * 60 * 60); // 24小时过期

      this.logger.log(`登录统计已更新 for user ${username}`);
    } catch (error) {
      this.logger.error(`更新登录统计信息失败: ${error.message}`);
    }
  }

  /**
   * 抽象方法：子类必须实现特定的登录后逻辑
   * @param userId 用户ID
   * @param username 用户名
   * @param token JWT token
   * @param additionalData 额外数据
   */
  protected abstract executeCustomLoginLogic(
    userId: number,
    username: string,
    token: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void>;

  /**
   * 抽象方法：子类必须实现用户特定的权限加载
   * @param userId 用户ID
   * @returns 用户权限信息
   */
  protected abstract loadUserSpecificPermissions(userId: number): Promise<{
    roles: string[];
    permissions: string[];
  }>;
}
