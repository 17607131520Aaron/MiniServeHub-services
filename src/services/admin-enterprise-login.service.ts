import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import type { IRedisService } from '@/interface/redis.interface';
import { BaseEnterpriseLoginService } from '@/common/base';

/**
 * 管理员专用的登录服务
 * 继承 BaseEnterpriseLoginService，实现管理员特定的登录后逻辑
 */
@Injectable()
export class AdminEnterpriseLoginService extends BaseEnterpriseLoginService {
  constructor(
    @Inject('IRedisService')
    redisService: IRedisService,
    jwtService: JwtService,
  ) {
    super(redisService, jwtService);
  }

  /**
   * 实现抽象方法：执行管理员特定的登录后逻辑
   */
  protected async executeCustomLoginLogic(
    userId: number,
    username: string,
    _token: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      this.logger.log(`执行管理员 ${username} 特定的登录后逻辑`);

      // 管理员特定的逻辑
      await this.performAdminSpecificTasks(userId, username, additionalData);

      // 记录管理员登录事件
      await this.logAdminLoginEvent(userId, username, additionalData);

      // 检查管理员权限变更
      await this.checkAdminPermissionChanges(userId);
    } catch (error) {
      this.logger.error(`执行管理员特定登录逻辑失败: ${error.message}`);
    }
  }

  /**
   * 实现抽象方法：加载管理员特定的权限
   */
  protected async loadUserSpecificPermissions(_userId: number): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    try {
      // 管理员拥有所有权限
      return {
        roles: ['admin', 'superuser', 'authenticated'],
        permissions: [
          'read',
          'write',
          'delete',
          'admin_panel',
          'user_management',
          'system_config',
          'audit_logs',
          'backup_restore',
          'security_settings',
        ],
      };
    } catch (error) {
      this.logger.error(`加载管理员权限失败: ${error.message}`);
      // 返回默认管理员权限
      return {
        roles: ['admin'],
        permissions: ['read', 'write', 'admin_panel'],
      };
    }
  }

  /**
   * 重写权限更新方法，添加管理员特定的权限管理
   */
  protected async updateUserPermissions(userId: number): Promise<void> {
    try {
      // 加载管理员特定的权限
      const permissions = await this.loadUserSpecificPermissions(userId);

      // 存储管理员权限到 Redis 缓存
      await this.redisService.set(
        `admin_permissions:${userId}`,
        JSON.stringify({
          ...permissions,
          lastUpdated: Date.now(),
          isAdmin: true,
          adminLevel: 'superuser',
        }),
        60 * 60,
      ); // 1小时过期

      await this.redisService.set(
        `admin_roles:${userId}`,
        JSON.stringify(permissions.roles),
        60 * 60,
      );

      // 设置管理员特殊标识
      await this.redisService.set(`is_admin:${userId}`, 'true', 24 * 60 * 60);

      this.logger.log(`管理员 ${userId} 权限已更新`);
    } catch (error) {
      this.logger.error(`更新管理员权限失败: ${error.message}`);
    }
  }

  /**
   * 重写异常检测方法，添加管理员特定的安全检测
   */
  protected async detectAnomalousLogin(
    userId: number,
    username: string,
    additionalData?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    try {
      // 先执行基类的异常检测
      await super.detectAnomalousLogin(userId, username, additionalData);

      // 管理员特定的异常检测
      await this.detectAdminSpecificAnomalies(userId, username, additionalData);
    } catch (error) {
      this.logger.error(`检测管理员异常登录行为失败: ${error.message}`);
    }
  }

  /**
   * 执行管理员特定的任务
   */
  private async performAdminSpecificTasks(
    userId: number,
    username: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // 更新管理员登录统计
      await this.redisService.incr('admin_total_logins');
      await this.redisService.incr('admin_daily_logins');

      // 记录管理员登录设备信息
      if (additionalData?.ip) {
        await this.redisService.set(
          `admin_last_ip:${userId}`,
          additionalData.ip as string,
          24 * 60 * 60,
        );
      }

      // 设置管理员会话超时（管理员会话时间更长）
      await this.redisService.expire(`admin_session:${userId}`, 48 * 60 * 60); // 48小时

      this.logger.log(`管理员 ${username} 特定任务已完成`);
    } catch (error) {
      this.logger.error(`执行管理员特定任务失败: ${error.message}`);
    }
  }

  /**
   * 记录管理员登录事件
   */
  private async logAdminLoginEvent(
    userId: number,
    username: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const adminEvent = {
        userId,
        username,
        eventType: 'admin_login',
        severity: 'medium',
        timestamp: Date.now(),
        details: {
          ip: additionalData?.ip || '127.0.0.1',
          userAgent: additionalData?.userAgent || 'Unknown',
          adminLevel: 'superuser',
          sessionDuration: '48h',
        },
      };

      // 存储到管理员专用审计日志
      await this.redisService.lpush('admin_audit_log', JSON.stringify(adminEvent));
      await this.redisService.ltrim('admin_audit_log', 0, 999); // 保留最近1000条记录

      this.logger.log(`管理员登录事件已记录: ${username}`);
    } catch (error) {
      this.logger.error(`记录管理员登录事件失败: ${error.message}`);
    }
  }

  /**
   * 检查管理员权限变更
   */
  private async checkAdminPermissionChanges(userId: number): Promise<void> {
    try {
      // 检查管理员权限是否有变更
      const lastPermissionCheck = await this.redisService.get(`admin_permission_check:${userId}`);
      const currentTime = Date.now();

      if (
        !lastPermissionCheck ||
        currentTime - parseInt(lastPermissionCheck) > 24 * 60 * 60 * 1000
      ) {
        // 24小时检查一次权限变更
        await this.redisService.set(
          `admin_permission_check:${userId}`,
          currentTime.toString(),
          24 * 60 * 60,
        );

        // 这里可以添加权限变更检测逻辑
        this.logger.log(`管理员 ${userId} 权限变更检查已完成`);
      }
    } catch (error) {
      this.logger.error(`检查管理员权限变更失败: ${error.message}`);
    }
  }

  /**
   * 检测管理员特定的异常行为
   */
  private async detectAdminSpecificAnomalies(
    userId: number,
    username: string,
    additionalData?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    try {
      const currentTime = Date.now();

      // 检查管理员是否在非常规时间登录
      const currentHour = new Date().getHours();
      if (currentHour < 5 || currentHour > 23) {
        await this.logSecurityEvent(userId, username, 'admin_unusual_login_time', {
          hour: currentHour,
          timestamp: currentTime,
          severity: 'high',
        });
      }

      // 检查管理员登录频率（管理员登录应该更频繁）
      const recentAdminLogins = await this.redisService.lrange(
        `admin_login_history:${userId}`,
        0,
        9,
      );
      if (recentAdminLogins.length >= 5) {
        const recentLoginTimes = recentAdminLogins.map((login) => JSON.parse(login).timestamp);
        const timeDiff = currentTime - recentLoginTimes[recentLoginTimes.length - 1];

        // 如果1小时内登录超过5次，记录异常
        if (timeDiff < 60 * 60 * 1000) {
          await this.logSecurityEvent(userId, username, 'admin_frequent_login', {
            attempts: recentAdminLogins.length,
            timeWindow: '1 hour',
            severity: 'medium',
          });
        }
      }

      // 记录管理员登录历史
      const adminLoginRecord = {
        timestamp: currentTime,
        ip: additionalData?.ip || '127.0.0.1',
        userAgent: additionalData?.userAgent || 'Unknown',
      };
      await this.redisService.lpush(
        `admin_login_history:${userId}`,
        JSON.stringify(adminLoginRecord),
      );
      await this.redisService.ltrim(`admin_login_history:${userId}`, 0, 49); // 保留最近50条记录

      this.logger.log(`管理员 ${username} 异常检测完成`);
    } catch (error) {
      this.logger.error(`检测管理员特定异常行为失败: ${error.message}`);
    }
  }
}
