-- Phase 9 階段3：後台的 LINE 群發（Flex Message）。
-- 這張表存在的理由是「送出後無法收回」—— LINE 沒有撤回已送出推播的方法，
-- 因此每一次群發都要留下「誰、何時、發了什麼、發給幾個人」的帳。
-- Expand-only（ADR-003）：只新增一張表與兩個 enum，不觸碰既有表與欄位，回滾＝直接 DROP。

CREATE TYPE "PushCampaignTemplate" AS ENUM ('EVENT', 'PAYMENT', 'GENERAL');
CREATE TYPE "PushCampaignAudience" AS ENUM ('ALL_PARENTS', 'CLASS', 'STAFF');

CREATE TABLE "PushCampaign" (
    "id" TEXT NOT NULL,
    "template" "PushCampaignTemplate" NOT NULL,
    "audience" "PushCampaignAudience" NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "buttonLabel" TEXT,
    "buttonUrl" TEXT,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PushCampaign_createdAt_idx" ON "PushCampaign"("createdAt");
