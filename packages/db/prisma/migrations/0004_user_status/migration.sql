-- Phase 9 階段2 刀3：帳號啟用/停用（只停用不刪除）。
-- Expand-only（ADR-003）：新增 enum + 一欄且帶預設值，既有列自動為 ACTIVE，對線上零風險。
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
