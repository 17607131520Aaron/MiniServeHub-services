// 环境变量配置
export const envConfig = {
  // 数据库配置
  database: {
    host: process.env.NODE_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    database: process.env.MYSQL_DATABASE || 'miniservehub',
  },
  // 应用配置
  app: {
    port: parseInt(process.env.SERVICE_PORT || '9000'),
    env: process.env.NODE_ENV || 'development',
  },
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  // RabbitMQ配置
  rabbitmq: {
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
  },
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};
