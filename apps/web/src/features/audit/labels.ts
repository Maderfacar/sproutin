import type { AuditResult } from '../../lib/types';
import { ROLE_LABEL } from '../../lib/roleLabels';

// 只有文字。顏色由呼叫端用 Badge + 狀態色決定（AuditPanel 的 RESULT_TONE）——
// 這裡原本還掛著一組 Tailwind 預設色的 className，早就沒有人讀，
// 但死掉的樣式最容易被下一個人複製走。
export const AUDIT_RESULT_LABEL: Record<AuditResult, { label: string }> = {
  SUCCESS: { label: '成功' },
  FAILURE: { label: '失敗' },
  DENIED: { label: '拒絕' },
};

// 常見資源類型（稽核篩選下拉;空 = 全部）。其他類型仍會出現在結果中。
export const AUDIT_RESOURCE_TYPES = ['Leave', 'Student', 'Message', 'Announcement', 'AuditLog'];

// 操作當下的身分 → 中文。後端存的是**當時**持有的角色，一個人可能同時有多個
// （園長兼帶班 → `OWNER,TEACHER`），因此拆開逐一翻譯再去重。
export function actorRoleLabel(actorRole: string | null): string | null {
  if (!actorRole) {
    return null;
  }
  const labels = [
    ...new Set(
      actorRole
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => ROLE_LABEL[r] ?? r),
    ),
  ];
  return labels.length > 0 ? labels.join(' · ') : null;
}

// 「這筆是誰做的」一句話。
//   - 沒有操作者 → 系統自己做的（例如 Worker 派送）
//   - 查得到姓名 → 姓名（身分）
//   - 查不到姓名 → 退回顯示 ID，**不假裝有名字**（帳號一律停用不刪除，正常不該發生）
export function actorText(actorName: string | null, actorUserId: string | null, actorRole: string | null): string {
  const role = actorRoleLabel(actorRole);
  if (!actorUserId) {
    return role ? `系統（${role}）` : '系統';
  }
  const who = actorName ?? actorUserId;
  return role ? `${who}（${role}）` : who;
}
