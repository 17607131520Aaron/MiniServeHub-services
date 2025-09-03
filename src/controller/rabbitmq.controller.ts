import { Controller, Post, Get, Body, Logger, BadRequestException } from '@nestjs/common';
import { RabbitMQService } from '@/services/rabbitmq.service';
import { ROUTING_KEYS } from '@/configs/rabbitmq.config';

@Controller('rabbitmq')
export class RabbitMQController {
  private readonly logger = new Logger(RabbitMQController.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get('test/status')
  public async getStatus(): Promise<{ connected: boolean; timestamp: string; message: string }> {
    try {
      const isConnected = await this.rabbitMQService.getConnectionStatus();
      return {
        connected: isConnected,
        timestamp: new Date().toISOString(),
        message: isConnected ? 'RabbitMQ连接正常' : 'RabbitMQ连接异常',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`获取RabbitMQ状态失败: ${err.message}`);
      throw new BadRequestException(`获取RabbitMQ状态失败: ${err.message}`);
    }
  }

  @Post('test/user')
  public async testUserMessage(
    @Body() body: { message?: string },
  ): Promise<Record<string, unknown>> {
    try {
      const testMessage: Record<string, unknown> = {
        id: Date.now(),
        message: body?.message || '测试用户消息',
        timestamp: new Date().toISOString(),
        type: 'test',
      };

      await this.rabbitMQService.publishUserMessage(ROUTING_KEYS.USER_CREATED, testMessage);

      return testMessage;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送测试用户消息失败: ${err.message}`);
      throw new BadRequestException(`发送测试用户消息失败: ${err.message}`);
    }
  }

  @Post('test/notification')
  public async testNotificationMessage(
    @Body() body: { message?: string },
  ): Promise<Record<string, unknown>> {
    try {
      const testMessage: Record<string, unknown> = {
        id: Date.now(),
        message: body?.message || '测试通知消息',
        timestamp: new Date().toISOString(),
        type: 'test',
      };

      await this.rabbitMQService.publishNotificationMessage(
        ROUTING_KEYS.NOTIFICATION_SENT,
        testMessage,
      );

      return testMessage;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送测试通知消息失败: ${err.message}`);
      throw new BadRequestException(`发送测试通知消息失败: ${err.message}`);
    }
  }

  @Post('test/email')
  public async testEmailMessage(
    @Body() body: { message?: string },
  ): Promise<Record<string, unknown>> {
    try {
      const testMessage: Record<string, unknown> = {
        id: Date.now(),
        message: body?.message || '测试邮件消息',
        timestamp: new Date().toISOString(),
        type: 'test',
      };

      await this.rabbitMQService.publishEmailMessage(ROUTING_KEYS.EMAIL_SENT, testMessage);

      return testMessage;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送测试邮件消息失败: ${err.message}`);
      throw new BadRequestException(`发送测试邮件消息失败: ${err.message}`);
    }
  }

  @Post('test/log')
  public async testLogMessage(
    @Body() body: { message?: string },
  ): Promise<Record<string, unknown>> {
    try {
      const testMessage: Record<string, unknown> = {
        id: Date.now(),
        message: body?.message || '测试日志消息',
        timestamp: new Date().toISOString(),
        type: 'test',
        level: 'info',
      };

      await this.rabbitMQService.publishLogMessage(ROUTING_KEYS.LOG_CREATED, testMessage);

      return testMessage;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`发送测试日志消息失败: ${err.message}`);
      throw new BadRequestException(`发送测试日志消息失败: ${err.message}`);
    }
  }
}
