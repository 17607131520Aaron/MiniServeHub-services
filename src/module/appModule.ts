import { Module } from '@nestjs/common';
import { RabbitMQAppModule } from './rabbitmq.module';
import { UserModule } from './user.module';
// import { RedisModule } from '@/configs/redis';
// import { RabbitMQAppModule } from '@/modules/rabbitmq/rabbitmq.module';
// import { AuthModule } from '@/auth/auth.module';
// import { UserModule } from './user/user.module';

@Module({
  imports: [UserModule, RabbitMQAppModule],
})
//全局APP模块
export class AppConfigModule {}
