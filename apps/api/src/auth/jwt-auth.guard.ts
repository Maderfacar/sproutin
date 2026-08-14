import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './auth.service';

// 認證請求的最小型別：帶 Authorization header，通過後掛上 req.user。
export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; roles: JwtPayload['roles'] };
}

// 只驗「是不是有效登入」（authentication）。
// 角色/資料列授權（RolesGuard + ScopeGuard）為 Step 3，本步不做。
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;

    if (!value || !value.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing_token');
    }

    const token = value.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      req.user = { id: payload.sub, roles: payload.roles };
      return true;
    } catch {
      throw new UnauthorizedException('invalid_token');
    }
  }
}
