/**
 * 公共基类类型定义
 * 定义所有基类应该遵循的通用接口和类型
 */

/**
 * 基础服务接口
 * 所有服务基类都应该实现这个接口
 */
export interface IBaseService {
  /**
   * 服务名称
   */
  readonly serviceName: string;

  /**
   * 服务版本
   */
  readonly version: string;

  /**
   * 初始化服务
   */
  initialize(): Promise<void>;

  /**
   * 销毁服务
   */
  destroy(): Promise<void>;

  /**
   * 获取服务状态
   */
  getStatus(): Promise<EServiceStatus>;
}

/**
 * 服务状态枚举
 */
export enum EServiceStatus {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * 基础配置接口
 */
export interface IBaseConfig {
  /**
   * 配置名称
   */
  name: string;

  /**
   * 配置值
   */
  value: unknown;

  /**
   * 配置描述
   */
  description?: string;

  /**
   * 是否必需
   */
  required: boolean;

  /**
   * 默认值
   */
  defaultValue?: unknown;
}

/**
 * 基础日志接口
 */
export interface IBaseLogger {
  /**
   * 记录信息日志
   */
  info(message: string, context?: string): void;

  /**
   * 记录警告日志
   */
  warn(message: string, context?: string): void;

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, context?: string): void;

  /**
   * 记录调试日志
   */
  debug(message: string, context?: string): void;
}

/**
 * 基础缓存接口
 */
export interface IBaseCache {
  /**
   * 设置缓存
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * 获取缓存
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * 删除缓存
   */
  delete(key: string): Promise<void>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 检查缓存是否存在
   */
  exists(key: string): Promise<boolean>;
}

/**
 * 基础验证接口
 */
export interface IBaseValidator {
  /**
   * 验证数据
   */
  validate<T>(data: T, schema: unknown): Promise<IValidationResult<T>>;

  /**
   * 验证单个字段
   */
  validateField<T>(value: T, fieldSchema: unknown): Promise<IFieldValidationResult<T>>;
}

/**
 * 验证结果接口
 */
export interface IValidationResult<T> {
  /**
   * 是否验证通过
   */
  isValid: boolean;

  /**
   * 验证后的数据
   */
  data: T;

  /**
   * 错误信息
   */
  errors: IValidationError[];
}

/**
 * 字段验证结果接口
 */
export interface IFieldValidationResult<T> {
  /**
   * 是否验证通过
   */
  isValid: boolean;

  /**
   * 验证后的值
   */
  value: T;

  /**
   * 错误信息
   */
  error?: string;
}

/**
 * 验证错误接口
 */
export interface IValidationError {
  /**
   * 字段路径
   */
  field: string;

  /**
   * 错误消息
   */
  message: string;

  /**
   * 错误代码
   */
  code?: string;
}

/**
 * 基础事件接口
 */
export interface IBaseEventEmitter {
  /**
   * 注册事件监听器
   */
  on(event: string, listener: EventListener): void;

  /**
   * 移除事件监听器
   */
  off(event: string, listener: EventListener): void;

  /**
   * 触发事件
   */
  emit(event: string, data?: unknown): void;

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number;
}

/**
 * 事件监听器类型
 */
export type EventListener = (data?: unknown) => void;

/**
 * 基础配置管理器接口
 */
export interface IBaseConfigManager {
  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T;

  /**
   * 设置配置值
   */
  set<T>(key: string, value: T): void;

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean;

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown>;

  /**
   * 重新加载配置
   */
  reload(): Promise<void>;
}

/**
 * 基础健康检查接口
 */
export interface IBaseHealthCheck {
  /**
   * 执行健康检查
   */
  check(): Promise<IHealthStatus>;

  /**
   * 获取健康状态
   */
  getStatus(): IHealthStatus;

  /**
   * 注册健康检查项
   */
  register(name: string, check: HealthCheckFunction): void;
}

/**
 * 健康状态接口
 */
export interface IHealthStatus {
  /**
   * 整体状态
   */
  status: 'healthy' | 'unhealthy' | 'degraded';

  /**
   * 检查时间
   */
  timestamp: Date;

  /**
   * 各项检查结果
   */
  checks: Record<string, IHealthCheckResult>;

  /**
   * 版本信息
   */
  version: string;
}

/**
 * 健康检查结果接口
 */
export interface IHealthCheckResult {
  /**
   * 检查状态
   */
  status: 'healthy' | 'unhealthy';

  /**
   * 响应时间（毫秒）
   */
  responseTime?: number;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 额外信息
   */
  details?: Record<string, unknown>;
}

/**
 * 健康检查函数类型
 */
export type HealthCheckFunction = () => Promise<IHealthCheckResult>;

/**
 * 基础指标收集器接口
 */
export interface IBaseMetricsCollector {
  /**
   * 增加计数器
   */
  increment(name: string, value?: number, labels?: Record<string, string>): void;

  /**
   * 设置仪表值
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * 记录直方图
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * 获取所有指标
   */
  getMetrics(): Promise<string>;
}

/**
 * 基础审计接口
 */
export interface IBaseAuditor {
  /**
   * 记录审计事件
   */
  log(event: IAuditEvent): Promise<void>;

  /**
   * 查询审计日志
   */
  query(filters: IAuditQueryFilters): Promise<IAuditEvent[]>;

  /**
   * 清理过期审计日志
   */
  cleanup(before: Date): Promise<number>;
}

/**
 * 审计事件接口
 */
export interface IAuditEvent {
  /**
   * 事件ID
   */
  id: string;

  /**
   * 事件类型
   */
  type: string;

  /**
   * 用户ID
   */
  userId?: string;

  /**
   * 用户名
   */
  username?: string;

  /**
   * 事件时间
   */
  timestamp: Date;

  /**
   * 事件详情
   */
  details: Record<string, unknown>;

  /**
   * IP地址
   */
  ip?: string;

  /**
   * 用户代理
   */
  userAgent?: string;

  /**
   * 严重程度
   */
  severity: 'low' | 'medium' | 'high';
}

/**
 * 审计查询过滤器接口
 */
export interface IAuditQueryFilters {
  /**
   * 开始时间
   */
  startTime?: Date;

  /**
   * 结束时间
   */
  endTime?: Date;

  /**
   * 事件类型
   */
  eventType?: string;

  /**
   * 用户ID
   */
  userId?: string;

  /**
   * 严重程度
   */
  severity?: 'low' | 'medium' | 'high';

  /**
   * 分页参数
   */
  page?: number;

  /**
   * 每页大小
   */
  pageSize?: number;
}
