# 环境变量配置说明

## 问题分析

当前环境变量读取不到的原因：

1. **缺少 `.env` 文件** - 环境变量文件不存在
2. **变量名称不一致** - 配置中使用的变量名与实际环境变量不匹配
3. **默认值处理不当** - 没有提供合理的默认值

## 解决方案

### 1. 创建环境变量文件

在项目根目录创建 `.env.development` 文件：

```bash
# 应用配置
NODE_ENV=development
SERVICE_PORT=9000

# 数据库配置
NODE_MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=123456
MYSQL_DATABASE=miniservehub

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ配置
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# JWT配置
JWT_SECRET=dev-secret-change-me-in-production
JWT_EXPIRES_IN=24h
```

### 2. 修复配置加载

已经修复了 `src/configs/env.config.ts` 文件：

- 统一了变量名称
- 添加了合理的默认值
- 支持多种环境变量名称

### 3. 环境变量优先级

环境变量加载优先级（从高到低）：

1. 系统环境变量
2. `.env.${NODE_ENV}` 文件
3. `.env` 文件
4. 代码中的默认值

### 4. 验证环境变量

在 `app.module.ts` 中添加环境变量验证：

```typescript
public onModuleInit(): void {
  // 验证环境变量
  console.log('🔍 环境变量验证:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`MYSQL_HOST: ${process.env.NODE_MYSQL_HOST || process.env.MYSQL_HOST}`);
  console.log(`REDIS_HOST: ${process.env.REDIS_HOST}`);
  console.log(`RABBITMQ_HOST: ${process.env.RABBITMQ_HOST}`);

  // ... 其他代码
}
```

## 常见问题

### Q: 为什么 `.env` 文件被忽略？

A: `.env` 文件包含敏感信息，被 `.gitignore` 忽略是安全做法。

### Q: 如何在不同环境使用不同配置？

A: 创建多个环境文件：

- `.env.development` - 开发环境
- `.env.test` - 测试环境
- `.env.production` - 生产环境

### Q: 环境变量还是读取不到怎么办？

A: 检查：

1. 文件路径是否正确
2. 变量名是否匹配
3. 应用是否重启
4. 系统环境变量是否冲突

## 最佳实践

1. **使用 `.env.example`** 作为模板
2. **统一变量命名规范**
3. **提供合理的默认值**
4. **在文档中说明所有环境变量**
5. **定期验证环境变量配置**
