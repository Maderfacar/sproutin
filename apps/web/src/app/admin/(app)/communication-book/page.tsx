'use client';

import { CommunicationBookView } from '../../../../features/communication-book/CommunicationBookView';

// 桌面版聯絡簿。與手機版 /liff/communication-book 共用 CommunicationBookView（docs/04 §3b）。
export default function AdminCommunicationBookPage() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">聯絡簿</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          一次一件事、全班一起填（直欄模式），健康與留言則逐生處理。
          填完一鍵送出全班；家長端在送出之後才看得到。
        </p>
      </header>
      <CommunicationBookView />
    </div>
  );
}
