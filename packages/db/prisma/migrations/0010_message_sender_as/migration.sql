-- 訊息記下「發話當下戴的是哪頂帽子」（Human Owner 2026-08-20 回報）。
--
-- 一人可能同時是這個孩子的家長與這一班的導師（老師自己的小孩也在園裡是幼兒園常態）。
-- 在同一串對話裡，「這句是導師的指示」與「這句是某位媽媽的請求」對讀的人是兩件事，
-- 但系統原本沒有記下來 —— 發話者身分是**讀取時推導**的，規則寫死成「是家長就顯示家長」，
-- 於是他以老師身分回的那句，其他家長看到的是「○○○ · 母親」說的。
--
-- Expand-only（ADR-003）：只加一個 enum 與一個 nullable 欄位，不觸碰既有資料；回滾＝DROP。
--
-- **不做回填**：舊訊息的 senderAs 留 null，讀取時退回原本的推導規則。
-- 我們並不知道當時他戴的是哪一頂，猜一個填進去比留白更糟。
--
-- 這不是權限欄位。能不能對這個學生發言仍然由 canAccessStudent 判斷；
-- 後端另外會驗證他真的持有所宣稱的身分才寫進來（見 messages.service.ts）。

-- CreateEnum
CREATE TYPE "MessageSenderAs" AS ENUM ('GUARDIAN', 'STAFF');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "senderAs" "MessageSenderAs";
