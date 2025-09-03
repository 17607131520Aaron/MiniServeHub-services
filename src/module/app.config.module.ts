import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { rabbitmqConfig } from '@/configs/rabbitmq.config';
import { RabbitMQService } from '@/services/rabbitmq.service';
import { RabbitMQController } from '@/controller/rabbitmq.controller';
import { RedisServiceImpl } from '@/services/redis.service';
import { RedisController } from '@/controller/redis.controller';
import { User } from '@/entity/user.entity';

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
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev-secret-change-me',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
  exports: [JwtModule],
})
export class AuthModule {}

@Module({
  imports: [RabbitMQModule.forRoot(rabbitmqConfig), UserModule, RedisModule, AuthModule],
  providers: [RabbitMQService],
  controllers: [RabbitMQController],
  exports: [RabbitMQService],
})
//全局APP模块
export class AppConfigModule {}
