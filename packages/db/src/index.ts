// @sproutin/db — Prisma client 單一匯出點
// 各 app 透過此 package 取得型別安全的 DB 存取。
// DATABASE_URL 由各校 instance 的環境變數注入 (§19)。
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
