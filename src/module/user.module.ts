import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserController } from '@/controller/user.controller';
import { UserInfoServiceImpl } from '@/services/user.services';
import { User } from '@/entity/user.entity';

@Module({
  imports: [
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
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserInfoService',
      useClass: UserInfoServiceImpl,
    },
  ],
  exports: ['IUserInfoService'],
})
export class UserModule {}
