# ADR-004 — Secret Management via Secret References

**Status:** Accepted (2026-08-11)

## Context

Control Plane 先前欄位 `databaseUrl`、`lineConfigRef` 命名易讓 implementation developer 誤存**明文憑證**。規定雖已說不得存明文，但欄位語意須在型別層就明確。

## Decision — Control Plane 只存 Secret Reference

### 1. 欄位改名 / 語意明確化

| 舊 | 新 | 內容 |
|----|----|------|
| `databaseUrl` | `databaseSecretRef` | Secret Manager 的 key/path/ARN，解析後得完整 `DATABASE_URL`（含密碼） |
| `lineConfigRef` | `lineSecretRef` | LINE Channel Secret / Access Token 的 ref |
| —（新增） | `jwtSecretRef` | JWT signing secret 的 ref |

Control Plane DB **不存**任何真正 credential/password/token，只存 reference。

### 2. Secret 解析鏈

```text
Control Plane (只存 ref)
      ↓ 部署時
Deployment Orchestrator 解析 ref
      ↓
Secret Manager 回傳真值
      ↓ 注入 container runtime env（不落地、不入 image、不入 git）
Runtime Environment
      ↓
App 讀 env
```

### 3. 適用範圍（同一原則）

- **DB credentials**：完整 `DATABASE_URL` 存 Secret Manager，Control Plane 只留 `databaseSecretRef`。
- **LINE Channel Secret / Access Token**：`lineSecretRef`。
- **JWT Secret**：`jwtSecretRef`。
- **其他敏感 config**：一律 secret ref。
- **非機密**（LIFF ID、LINE 公開 channel/basic id、branding）：**不是 secret**，存該校 DB 的 `SchoolConfig`，經 `/config/public` 提供。

## Alternatives Considered

- **Control Plane 存加密後的明文**：仍是 Control Plane 持有密鑰材料，擴大洩漏面與金鑰輪替複雜度。否決。
- **secret 放 image / env file 進 git**：明確禁止。否決。

## Consequences

- (+) Control Plane 外洩不等於憑證外洩（只有 reference）。
- (+) 金鑰輪替只需更新 Secret Manager，不動 Control Plane 資料。
- (−) 部署期多一步 secret 解析，需 Secret Manager 可用性（部署時，非請求時）。
- 影響：control-plane schema 改名三欄；deployment 定義解析鏈；`.env.example` 標注這些值來自 secret manager。
