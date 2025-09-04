import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserController } from '@/controller/user.controller';
import { UserInfoServiceImpl } from '@/services/user.services';
import { User } from '@/entity/user.entity';
import { UserBaseController } from '@/controller/userBase.controller';
import { UserBasesServices } from '@/services/userBases.services';
import { UserWx } from '@/entity/userWx.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserWx]),
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
  controllers: [UserController, UserBaseController],
  providers: [
    {
      provide: 'IUserInfoService',
      useClass: UserInfoServiceImpl,
    },
    UserBasesServices,
  ],
  exports: ['IUserInfoService', UserBasesServices],
})
export class UserModule {}
