import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, Role, ScopeType } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { LineVerifier } from './line-verifier.service';

// Sproutin JWT 內容：sub=userId，roles 供前端顯示 + 後端 guard 粗判（Step 3 再細化）。
export interface JwtPayload {
  sub: string;
  roles: AuthUser['roles'];
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

// 認證核心：LINE ID token → User → 簽發 Sproutin JWT。
// LINE User ID 僅用於「查出是誰」，之後一律以 userId 為業務主體。
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly lineVerifier: LineVerifier,
  ) {}

  async loginWithLine(idToken: string): Promise<LoginResult> {
    const payload = await this.lineVerifier.verify(idToken);

    const identity = await this.prisma.lineIdentity.findUnique({
      where: { lineUserId: payload.sub },
      include: { user: { include: { roles: true } } },
    });

    // Step 2 決定：未 provisioned（校方未預先建立）→ 拒絕，不自助註冊。
    if (!identity) {
      throw new UnauthorizedException('user_not_provisioned');
    }

    const user = this.toAuthUser(identity.user);
    const accessToken = await this.jwt.signAsync({ sub: user.id, roles: user.roles });
    return { accessToken, user };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }
    return this.toAuthUser(user);
  }

  private toAuthUser(user: {
    id: string;
    displayName: string;
    roles: { role: string; scopeType: string; scopeId: string | null }[];
  }): AuthUser {
    return {
      id: user.id,
      displayName: user.displayName,
      roles: user.roles.map((r) => ({
        role: r.role as Role,
        scopeType: r.scopeType as ScopeType,
        scopeId: r.scopeId,
      })),
    };
  }
}
