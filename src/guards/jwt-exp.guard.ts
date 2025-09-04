import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

function isSwaggerRequest(request: Request): boolean {
  const url: string = request?.url || '';
  const referer: string =
    (request?.headers?.referer as string) || (request?.headers?.referrer as string) || '';
  // Swagger UI is mounted at /api (see main.ts), and its JSON is at /api-json
  if (url.startsWith('/api') || url === '/api-json') {
    return true;
  }
  if (typeof referer === 'string' && referer.includes('/api')) {
    return true;
  }
  return false;
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function isAuthPublicRequest(request: Request): boolean {
  const url: string = request?.url || '';
  if (url.startsWith('/auth/')) return true;
  // 放行小程序登录/注册接口
  if (url.startsWith('/userBases/miniProgramLogin')) return true; // 兼容旧接口
  if (url.startsWith('/userBases/miniProgram/register')) return true;
  if (url.startsWith('/userBases/miniProgram/login')) return true;
  return false;
}

@Injectable()
export class JwtExpiryGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();

    // Bypass for Swagger UI and its requests
    if (isSwaggerRequest(request)) {
      return true;
    }

    // Bypass for public auth routes
    if (isAuthPublicRequest(request)) {
      return true;
    }

    const authHeader: string | undefined = request.headers?.authorization;
    const token = extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    try {
      const secret = this.config.get<string>('JWT_SECRET') || 'dev-secret-change-me';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      (request as unknown as { user?: unknown }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
