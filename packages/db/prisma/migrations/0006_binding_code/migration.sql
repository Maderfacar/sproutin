-- Phase 9 階段3：LINE 帳號綁定碼。
-- 園所後台建立的帳號與本人的 LINE 帳號之間本來沒有任何對應線索；綁定碼是園所簽發、
-- 由本人輸入一次的憑證，把兩者接起來。
-- Expand-only（ADR-003）：只新增一張表，不觸碰既有表與欄位，回滾＝直接 DROP。

CREATE TABLE "BindingCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByLineUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BindingCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BindingCode_code_key" ON "BindingCode"("code");
CREATE INDEX "BindingCode_userId_idx" ON "BindingCode"("userId");

ALTER TABLE "BindingCode"
    ADD CONSTRAINT "BindingCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
