import { Module, Global } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { rabbitmqConfig } from '@/configs/rabbitmq.config';
import { RabbitMQService } from '@/services/rabbitmq.service';
import { RabbitMQController } from '@/controller/rabbitmq.controller';
import { RedisServiceImpl } from '@/services/redis.service';
import { RedisController } from '@/controller/redis.controller';

import { UserModule } from './user.module';

/**
 * Redis模块
 * 提供Redis连接、操作和监控功能
 * 设置为全局模块，其他模块可以直接注入使用
 */
@Global()
@Module({
  controllers: [RedisController],
  providers: [
    {
      provide: 'IRedisService',
      useClass: RedisServiceImpl,
    },
  ],
  exports: ['IRedisService'],
})
export class RedisModule {}

@Module({
  imports: [RabbitMQModule.forRoot(rabbitmqConfig), UserModule, RedisModule],
  providers: [RabbitMQService],
  controllers: [RabbitMQController],
  exports: [RabbitMQService],
})
//全局APP模块
export class AppConfigModule {}
