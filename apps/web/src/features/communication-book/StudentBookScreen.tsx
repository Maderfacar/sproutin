'use client';

import { useCapabilities } from '../../lib/useCapabilities';
import { StudentBookView } from './StudentBookView';

// 單一學生的聯絡簿（老師從班級名單點進來、家長從首頁摘要點進來）。
// 授權完全由後端決定：老師只開得了自班學生、家長只開得了自己小孩。
export function StudentBookScreen({ studentId }: { studentId: string }) {
  // 依身分不是角色聯集：老師兼家長切到家長身分看自己小孩那一本時，是「看」不是「填」。
  const flags = useCapabilities();
  return <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />;
}
