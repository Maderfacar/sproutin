import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LineVerifier } from './line-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ScopeGuard } from './scope.guard';
import { ScopeResolver } from './scope-resolver.service';

// JWT 簽章金鑰由平台注入（Render generateValue，ADR-004）。
// 本地/測試無 JWT_SECRET 時用臨時值；正式環境永遠有真值。
const jwtSecret = process.env.JWT_SECRET ?? 'dev-only-insecure-secret';

@Module({
  imports: [
    // PrismaModule 為 @Global，PrismaService 可直接注入，無需在此 import。
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LineVerifier, JwtAuthGuard, RolesGuard, ScopeGuard, ScopeResolver],
  // 匯出 guards/resolver 供 domain 模組（如 StudentsModule）掛用（Step 3 RBAC）。
  exports: [JwtAuthGuard, RolesGuard, ScopeGuard, ScopeResolver],
})
export class AuthModule {}
