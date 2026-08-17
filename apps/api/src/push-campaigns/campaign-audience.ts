import type { Prisma, Role } from '@sproutin/db';
import type { PushCampaignAudienceName } from './push-campaign.types';

// 群發的收件人解析。**刻意寫成不依賴 DI 的純函式**：api（送出前預估人數）與 worker（實際送出）
// 兩邊都要用，若做成 provider 就得讓 worker 的精簡 DI 圖去 import 業務模組，
// 圖文選單那邊已經踩過模組循環相依（AuthModule ↔ RichMenuModule），這次直接避開。
//
// 收件範圍（Human Owner 定案）：
//   ALL_PARENTS 全校家長／監護人 ｜ CLASS 指定班級學生的家長 ｜ STAFF 教職員
// 「指定班級」不含該班老師 —— 老師走 STAFF 那個選項，否則勾一個班會意外多發給老師。
//
// **「家長」以兩種來源的聯集認定：身分欄位（PARENT/GUARDIAN）或實際的監護關聯（Guardianship）。**
// 起初只看身分欄位，會出現反直覺的結果：有人收得到班級群發卻收不到全校群發
// （班級是靠 Guardianship 認定的）。園長理所當然會假設「某班家長 ⊆ 全校家長」，
// 用兩套標準就破壞了這個包含關係。聯集讓它必然成立。
// 兩種來源都該算：只有身分沒有關聯＝剛建好還沒綁小孩的家長帳號；
// 只有關聯沒有身分＝後台補了監護關係卻忘了給身分。漏掉任一種，園所都會以為系統漏發。
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
    // 班級只能靠 Guardianship 認定 —— 身分欄位沒有班級資訊。
    return { guardianOf: { some: { student: { classId: classId ?? '', status: 'ACTIVE' } } } };
  }
  // 全校家長＝有家長身分 **或** 有在學學生的監護關聯（見上方說明）。
  return {
    OR: [
      { roles: { some: { role: { in: PARENT_ROLES } } } },
      { guardianOf: { some: { student: { status: 'ACTIVE' } } } },
    ],
  };
}
