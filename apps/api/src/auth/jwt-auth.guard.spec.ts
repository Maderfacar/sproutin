import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from './jwt-auth.guard';

function ctxWith(headers: AuthedRequest['headers']): { ctx: ExecutionContext; req: AuthedRequest } {
  const req: AuthedRequest = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
  const guard = new JwtAuthGuard(jwt);

  it('有效 Bearer token → 通過並掛上 req.user', async () => {
    const token = await jwt.signAsync({ sub: 'user-owner', roles: [] });
    const { ctx, req } = ctxWith({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user?.id).toBe('user-owner');
  });

  it('缺 Authorization → 401', async () => {
    const { ctx } = ctxWith({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('無效 token → 401', async () => {
    const { ctx } = ctxWith({ authorization: 'Bearer not-a-real-token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
