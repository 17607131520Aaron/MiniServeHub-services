import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { UserWx } from '@/entity/userWx.entity';
import { MiniAppController } from '@/controller/miniapp.controller';
import { MiniAppService } from '@/services/miniapp.service';
import { HttpClientService } from '@/common/http/http-client.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserWx]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev-secret-change-me',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1h' },
      }),
    }),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [MiniAppController],
  providers: [MiniAppService, HttpClientService],
  exports: [MiniAppService, HttpClientService],
})
export class MiniAppModule {}
