import { Injectable, Logger } from '@nestjs/common';
import { IBaseService, EServiceStatus } from './base.types';

/**
 * 基类管理器
 * 用于统一管理和注册不同类型的基类
 */
@Injectable()
export class BaseManager {
  private readonly logger = new Logger(BaseManager.name);
  private readonly services = new Map<string, IBaseService>();
  private readonly serviceStatus = new Map<string, EServiceStatus>();

  /**
   * 注册服务
   * @param service 服务实例
   */
  public registerService(service: IBaseService): void {
    try {
      const serviceName = service.serviceName;

      if (this.services.has(serviceName)) {
        this.logger.warn(`服务 ${serviceName} 已存在，将被覆盖`);
      }

      this.services.set(serviceName, service);
      this.serviceStatus.set(serviceName, EServiceStatus.INITIALIZING);

      this.logger.log(`服务 ${serviceName} 已注册`);
    } catch (error) {
      this.logger.error(`注册服务失败: ${error.message}`);
    }
  }

  /**
   * 获取服务
   * @param serviceName 服务名称
   * @returns 服务实例
   */
  public getService<T extends IBaseService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T;
  }

  /**
   * 获取所有服务
   * @returns 所有服务实例
   */
  public getAllServices(): Map<string, IBaseService> {
    return new Map(this.services);
  }

  /**
   * 获取服务状态
   * @param serviceName 服务名称
   * @returns 服务状态
   */
  public getServiceStatus(serviceName: string): EServiceStatus | undefined {
    return this.serviceStatus.get(serviceName);
  }

  /**
   * 获取所有服务状态
   * @returns 所有服务状态
   */
  public getAllServiceStatus(): Map<string, EServiceStatus> {
    return new Map(this.serviceStatus);
  }

  /**
   * 初始化所有服务
   */
  public async initializeAllServices(): Promise<void> {
    this.logger.log('开始初始化所有服务...');

    const initPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        this.serviceStatus.set(name, EServiceStatus.INITIALIZING);
        await service.initialize();
        this.serviceStatus.set(name, EServiceStatus.RUNNING);
        this.logger.log(`服务 ${name} 初始化成功`);
      } catch (error) {
        this.serviceStatus.set(name, EServiceStatus.ERROR);
        this.logger.error(`服务 ${name} 初始化失败: ${error.message}`);
      }
    });

    await Promise.allSettled(initPromises);
    this.logger.log('所有服务初始化完成');
  }

  /**
   * 销毁所有服务
   */
  public async destroyAllServices(): Promise<void> {
    this.logger.log('开始销毁所有服务...');

    const destroyPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        await service.destroy();
        this.serviceStatus.set(name, EServiceStatus.STOPPED);
        this.logger.log(`服务 ${name} 销毁成功`);
      } catch (error) {
        this.logger.error(`服务 ${name} 销毁失败: ${error.message}`);
      }
    });

    await Promise.allSettled(destroyPromises);
    this.logger.log('所有服务销毁完成');
  }

  /**
   * 检查服务健康状态
   * @returns 健康状态报告
   */
  public async checkAllServicesHealth(): Promise<Map<string, EServiceStatus>> {
    this.logger.log('开始检查所有服务健康状态...');

    const healthPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        const status = await service.getStatus();
        this.serviceStatus.set(name, status);
        this.logger.log(`服务 ${name} 健康检查完成: ${status}`);
      } catch (error) {
        this.serviceStatus.set(name, EServiceStatus.ERROR);
        this.logger.error(`服务 ${name} 健康检查失败: ${error.message}`);
      }
    });

    await Promise.allSettled(healthPromises);
    this.logger.log('所有服务健康检查完成');

    return new Map(this.serviceStatus);
  }

  /**
   * 获取运行中的服务数量
   * @returns 运行中的服务数量
   */
  public getRunningServicesCount(): number {
    return Array.from(this.serviceStatus.values()).filter(
      (status) => status === EServiceStatus.RUNNING,
    ).length;
  }

  /**
   * 获取错误状态的服务数量
   * @returns 错误状态的服务数量
   */
  public getErrorServicesCount(): number {
    return Array.from(this.serviceStatus.values()).filter(
      (status) => status === EServiceStatus.ERROR,
    ).length;
  }

  /**
   * 获取服务统计信息
   * @returns 服务统计信息
   */
  public getServiceStatistics(): {
    total: number;
    running: number;
    stopped: number;
    error: number;
    initializing: number;
  } {
    const statuses = Array.from(this.serviceStatus.values());

    return {
      total: statuses.length,
      running: statuses.filter((s) => s === EServiceStatus.RUNNING).length,
      stopped: statuses.filter((s) => s === EServiceStatus.STOPPED).length,
      error: statuses.filter((s) => s === EServiceStatus.ERROR).length,
      initializing: statuses.filter((s) => s === EServiceStatus.INITIALIZING).length,
    };
  }

  /**
   * 移除服务
   * @param serviceName 服务名称
   */
  public removeService(serviceName: string): boolean {
    const removed = this.services.delete(serviceName);
    this.serviceStatus.delete(serviceName);

    if (removed) {
      this.logger.log(`服务 ${serviceName} 已移除`);
    }

    return removed;
  }

  /**
   * 清空所有服务
   */
  public clearAllServices(): void {
    this.services.clear();
    this.serviceStatus.clear();
    this.logger.log('所有服务已清空');
  }
}
