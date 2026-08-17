import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LineVerifier, LineIdTokenPayload } from './line-verifier.service';

// 用 mock LineVerifier + mock Prisma 驗證整條交換邏輯（CI 不需真 LINE、不需 DB）。
type PrismaMock = {
  lineIdentity: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
};

function makeService(
  prisma: PrismaMock,
  verifyResult: LineIdTokenPayload | Error,
  redeem: jest.Mock = jest.fn(),
) {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
  const verifier: Pick<LineVerifier, 'verify'> = {
    verify: jest.fn(async () => {
      if (verifyResult instanceof Error) throw verifyResult;
      return verifyResult;
    }),
  };
  const bindingCodes = { redeem };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const service = new AuthService(
    prisma as any,
    jwt,
    verifier as LineVerifier,
    bindingCodes as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return { service, jwt, redeem };
}

const seededIdentity = {
  user: {
    id: 'user-owner',
    displayName: '王園長',
    roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }],
  },
};

describe('AuthService', () => {
  it('已 provisioned：LINE token → 簽發 JWT + 回 user/roles', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn(async () => seededIdentity) },
      user: { findUnique: jest.fn() },
    };
    const { service, jwt } = makeService(prisma, {
      sub: 'Udemo_owner',
      aud: '2011106015',
      exp: 9999999999,
    });

    const result = await service.loginWithLine('fake-id-token');

    expect(result.user).toEqual({
      id: 'user-owner',
      displayName: '王園長',
      roles: [{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }],
    });
    // JWT 內容 sub=userId（LINE ID 不進 JWT 業務主體）
    const decoded = await jwt.verifyAsync(result.accessToken);
    expect(decoded.sub).toBe('user-owner');
    // 查詢用的是 LINE user id
    expect(prisma.lineIdentity.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lineUserId: 'Udemo_owner' } }),
    );
  });

  it('未 provisioned：查無 LineIdentity → 401 user_not_provisioned', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn(async () => null) },
      user: { findUnique: jest.fn() },
    };
    const { service } = makeService(prisma, {
      sub: 'Uunknown',
      aud: '2011106015',
      exp: 9999999999,
    });

    await expect(service.loginWithLine('fake')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('LINE token 無效：verifier 丟錯 → 傳遞 401', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    const { service } = makeService(prisma, new UnauthorizedException('line_token_invalid'));

    await expect(service.loginWithLine('bad')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.lineIdentity.findUnique).not.toHaveBeenCalled();
  });

  it('綁定：驗證 LINE token → 兌換綁定碼 → 直接簽發 JWT（不需先登入）', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn() },
      user: {
        findUnique: jest.fn(async () => ({
          id: 'user-parent',
          displayName: '張媽媽',
          roles: [{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }],
        })),
      },
    };
    const redeem = jest.fn(async () => 'user-parent');
    const { service, jwt } = makeService(
      prisma,
      { sub: 'Unew_line_user', aud: '2011106015', exp: 9999999999 },
      redeem,
    );

    const result = await service.bindWithLine('fake-id-token', 'ABCD-2345');

    // 兌換時帶的是「經 LINE 驗證過的」sub，不是前端自稱的值。
    expect(redeem).toHaveBeenCalledWith('ABCD-2345', 'Unew_line_user');
    expect(result.user.id).toBe('user-parent');
    const decoded = await jwt.verifyAsync(result.accessToken);
    expect(decoded.sub).toBe('user-parent');
  });

  it('綁定：LINE token 無效 → 不會去兌換碼', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    const redeem = jest.fn();
    const { service } = makeService(prisma, new UnauthorizedException('line_token_invalid'), redeem);

    await expect(service.bindWithLine('bad', 'ABCD-2345')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(redeem).not.toHaveBeenCalled();
  });

  it('me：以 userId 取回 user + roles', async () => {
    const prisma: PrismaMock = {
      lineIdentity: { findUnique: jest.fn() },
      user: {
        findUnique: jest.fn(async () => ({
          id: 'user-teacher-sun',
          displayName: '林老師',
          roles: [{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-sunflower' }],
        })),
      },
    };
    const { service } = makeService(prisma, { sub: 'x', aud: '2011106015', exp: 1 });

    const me = await service.me('user-teacher-sun');

    expect(me.roles[0]).toEqual({
      role: 'TEACHER',
      scopeType: 'CLASS',
      scopeId: 'class-sunflower',
    });
  });
});
