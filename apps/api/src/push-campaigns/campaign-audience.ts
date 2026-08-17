import type { Prisma, Role } from '@sproutin/db';
import type { PushCampaignAudienceName } from './push-campaign.types';

// 群發的收件人解析。**刻意寫成不依賴 DI 的純函式**：api（送出前預估人數）與 worker（實際送出）
// 兩邊都要用，若做成 provider 就得讓 worker 的精簡 DI 圖去 import 業務模組，
// 圖文選單那邊已經踩過模組循環相依（AuthModule ↔ RichMenuModule），這次直接避開。
//
// 收件範圍（Human Owner 定案）：
//   ALL_PARENTS 全校家長／監護人 ｜ CLASS 指定班級學生的家長 ｜ STAFF 教職員
// 「指定班級」不含該班老師 —— 老師走 STAFF 那個選項，否則勾一個班會意外多發給老師。
const PARENT_ROLES: Role[] = ['PARENT', 'GUARDIAN'];
const STAFF_ROLES: Role[] = ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'];

export interface CampaignRecipients {
  // 真的收得到的人（已綁定 LINE）。這個數字才是「會送出 N 則」。
  lineUserIds: string[];
  // 在收件範圍內、但還沒綁定 LINE 所以收不到的人數。
  // **一定要一起顯示**：只給一個數字會讓園長以為系統漏發了。
  unboundCount: number;
}

export async function resolveCampaignRecipients(
  tx: Prisma.TransactionClient,
  audience: PushCampaignAudienceName,
  classId: string | null,
): Promise<CampaignRecipients> {
  const users = await tx.user.findMany({
    // 停用的帳號不收群發（離職的老師、已離園的家長）。
    where: { status: 'ACTIVE', ...audienceFilter(audience, classId) },
    select: { lineIdentity: { select: { lineUserId: true } } },
  });

  const lineUserIds = users
    .map((u) => u.lineIdentity?.lineUserId)
    .filter((id): id is string => Boolean(id));

  return { lineUserIds, unboundCount: users.length - lineUserIds.length };
}

function audienceFilter(
  audience: PushCampaignAudienceName,
  classId: string | null,
): Prisma.UserWhereInput {
  if (audience === 'STAFF') {
    return { roles: { some: { role: { in: STAFF_ROLES } } } };
  }
  if (audience === 'CLASS') {
    // 班級不存在或已無在學學生 → 查不到任何人（0 則），不是錯誤。
    // 家長身分由 Guardianship 認定（那是實際的親子關聯，比角色欄位精準）。
    return { guardianOf: { some: { student: { classId: classId ?? '', status: 'ACTIVE' } } } };
  }
  return { roles: { some: { role: { in: PARENT_ROLES } } } };
}
