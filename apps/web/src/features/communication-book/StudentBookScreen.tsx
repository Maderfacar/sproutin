'use client';

import { useCapabilities } from '../../lib/useCapabilities';
import { useVisibleStudents } from '../students/useSelectedStudent';
import { EmptyState, SkeletonCards } from '../../components/ui';
import { StudentBookView } from './StudentBookView';

// 單一學生的聯絡簿（老師從班級名單點進來、家長從首頁摘要或訊息中心點進來）。
// 授權完全由後端決定：老師只開得了自班學生、家長只開得了自己小孩。
//
// **這一頁的網址帶著 studentId，所以身分的範圍也要套在它身上**
//（Human Owner 2026-08-20 回報：家長身分從訊息中心點進來，看得到別人小孩的聯絡簿）。
// 訊息中心那一側已經在後端切乾淨了，但網址是可以被貼、被記住、被舊通知帶進來的
// —— 入口擋住不等於門擋住。
export function StudentBookScreen({ studentId }: { studentId: string }) {
  // 依身分不是角色聯集：老師兼家長切到家長身分看自己小孩那一本時，是「看」不是「填」。
  const flags = useCapabilities();
  const { data: students, isLoading } = useVisibleStudents();

  if (isLoading) {
    return <SkeletonCards cards={2} />;
  }

  // 名單還沒回來（例如查詢失敗）就先放行，讓後端當最後一道 —— 這裡是介面的守門，不是授權。
  if (students && !students.some((s) => s.id === studentId)) {
    return (
      <EmptyState
        title="看不到這個孩子的聯絡簿"
        hint="以目前的身分只看得到自己的小孩。如果你也是這個班的老師，請從右上角切回老師身分再打開一次。"
      />
    );
  }

  return <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />;
}
