'use client';

import { PageHeader } from '../../../components/PageHeader';
import { useActivePersona } from '../../../lib/usePersona';
import { CommunicationBookView } from '../../../features/communication-book/CommunicationBookView';
import { ParentBook } from '../../../features/communication-book/ParentBook';

// 聯絡簿。家長看到的是自己小孩的那一本（只有一個小孩就直接打開），
// 校方看到的是「今天要填的整班 + 翻閱單一學生」——同一個網址，依身分決定渲染哪一頁。
//
// 校方那一邊在第三、四批才改版，現在仍是共用的 CommunicationBookView
//（與桌面 /admin/communication-book 同一份）。
export default function CommunicationBookPage() {
  const { persona } = useActivePersona();
  const isParent = persona === 'parent';

  return (
    <div className="flex flex-col gap-5">
      {/* 家長的聯絡簿是底部頁籤之一（最上層，退無可退）→ 不放返回鍵。 */}
      <PageHeader title="聯絡簿" back={!isParent} />
      {isParent ? <ParentBook /> : <CommunicationBookView />}
    </div>
  );
}
