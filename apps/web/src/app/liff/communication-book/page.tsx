'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { CommunicationBookView } from '../../../features/communication-book/CommunicationBookView';
import { ParentBook } from '../../../features/communication-book/ParentBook';
import { TeacherBookPanel } from '../../../features/communication-book/TeacherBookPanel';

// 聯絡簿。同一個網址，三種身分看到三件事：
//   家長＝自己小孩那一本（只有一個小孩就直接打開；底部頁籤之一 → 不放返回鍵）
//   導師＝今天整班要填的（直欄模式；底部頁籤之一 → 不放返回鍵）
//   行政／園長＝仍是共用的 CommunicationBookView（第四批才改版）
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

  if (persona === 'teacher') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="今天的聯絡簿" back={false} />
        <TeacherBookPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="聯絡簿" />
      <CommunicationBookView />
    </div>
  );
}
