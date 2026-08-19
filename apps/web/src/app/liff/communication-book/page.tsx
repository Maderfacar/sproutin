'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { ParentBook } from '../../../features/communication-book/ParentBook';
import { TeacherBookPanel } from '../../../features/communication-book/TeacherBookPanel';

// 聯絡簿。同一個網址，依身分決定渲染哪一頁：
//   家長＝自己小孩那一本（只有一個小孩就直接打開；底部頁籤之一 → 不放返回鍵）
//   校方＝今天整班要填的（直欄模式）
//
// 要翻某一個孩子過去的紀錄，從班級名單或直欄模式那一列的箭頭點進去
//（/liff/communication-book/[studentId]），不在這一頁再開一段。
export default function CommunicationBookPage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="聯絡簿" back={false} />
        <ParentBook />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="今天的聯絡簿" back={persona !== 'teacher'} />
      <TeacherBookPanel />
    </div>
  );
}
