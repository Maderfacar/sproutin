-- Phase 9 階段3 ④：園所的 LINE 圖文選單設計。
-- 設計存在這裡（隨便存幾次都行），實際送到 LINE 是另一個動作 —— 因為 LINE 不允許覆蓋既有
-- 選單的底圖（換圖＝建新選單、綁人、刪舊的），且「建立選單」有每小時 100 次的上限。
-- Expand-only（ADR-003）：只新增一張表與兩個 enum，不觸碰既有表與欄位，回滾＝直接 DROP。

CREATE TYPE "RichMenuAudience" AS ENUM ('PARENT', 'STAFF', 'UNBOUND');
CREATE TYPE "RichMenuTemplate" AS ENUM ('SIX', 'FOUR', 'TWO');

CREATE TABLE "RichMenuConfig" (
    "id" TEXT NOT NULL,
    "audience" "RichMenuAudience" NOT NULL,
    "template" "RichMenuTemplate" NOT NULL DEFAULT 'SIX',
    "imageUrl" TEXT,
    "chatBarText" TEXT NOT NULL DEFAULT '開啟選單',
    "items" JSONB NOT NULL DEFAULT '[]',
    "lineRichMenuId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RichMenuConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RichMenuConfig_audience_key" ON "RichMenuConfig"("audience");
