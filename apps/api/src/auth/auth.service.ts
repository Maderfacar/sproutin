import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, Role, ScopeType } from '@sproutin/shared';
import { PrismaService } from '../core/prisma/prisma.service';
import { LineVerifier } from './line-verifier.service';
import { BindingCodeService } from './binding-code.service';

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
    private readonly bindingCodes: BindingCodeService,
  ) {}

  // POST /auth/line/bind — 尚未綁定的 LINE 帳號輸入園所給的綁定碼，接上自己的帳號。
  // 刻意做成「驗證 idToken + 兌換碼 + 簽發 JWT」一次完成：若拆成兩步，中間需要一個
  // 「已驗證 LINE 但還沒有身分」的臨時 token，那是多出來的攻擊面，沒有必要。
  async bindWithLine(idToken: string, code: string): Promise<LoginResult> {
    const payload = await this.lineVerifier.verify(idToken);
    const userId = await this.bindingCodes.redeem(code, payload.sub);
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!found) {
      throw new UnauthorizedException('user_not_found');
    }
    return this.issueToken(found);
  }

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

    // 階段2 刀3：帳號已停用 → 拒絕登入（帳號不刪除，只停用）。
    if (identity.user.status === 'INACTIVE') {
      throw new UnauthorizedException('user_inactive');
    }

    // identity 已 include user.roles，直接簽發，不再多查一次。
    return this.issueToken(identity.user);
  }

  // 組 AuthUser + 簽發 JWT（登入與綁定共用，避免兩條路徑各自組裝而漂移）。
  private async issueToken(found: {
    id: string;
    displayName: string;
    roles: { role: string; scopeType: string; scopeId: string | null }[];
  }): Promise<LoginResult> {
    const user = this.toAuthUser(found);
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
    // 停用後既有 JWT 仍在效期內 → 於 /me 再擋一次，使 App 下次載入即失效。
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('user_inactive');
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
