'use client';

import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { StudentBookView } from './StudentBookView';

// 單一學生的聯絡簿（老師從班級名單點進來、家長從首頁摘要點進來）。
// 授權完全由後端決定：老師只開得了自班學生、家長只開得了自己小孩。
export function StudentBookScreen({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  return <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />;
}
