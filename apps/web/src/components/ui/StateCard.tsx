import type { ReactNode } from 'react';
import { TONE, type Tone } from './tone';

// 狀態卡：一頁的那句答案。**一頁只准有一張。**
//
// 家長打開 App 想知道的是「我小孩今天怎麼樣」，不是一堆欄位讓他自己判斷。
// 所以這張卡的形狀就是一個回答：誰和什麼時候（eyebrow）→ 答案（大字）→ 怎麼來的（一行）。
// 整張用狀態色，遠遠看顏色就知道結果，走近才需要讀字。

interface StateCardProps {
  /** 誰 · 什麼時候。例：「王小明 · 今天」 */
  eyebrow?: string;
  /** 那句答案。例：「已到校」。這是整頁唯一的 display 級字。 */
  headline: string;
  /** 怎麼來的。例：「早上 8:12 進教室」 */
  detail?: string;
  tone?: Tone;
  /** 右上角的圖示或動作。 */
  aside?: ReactNode;
  children?: ReactNode;
}

export function StateCard({
  eyebrow,
  headline,
  detail,
  tone = 'good',
  aside,
  children,
}: StateCardProps) {
  return (
    <section className={`rounded-tile border p-5 ${TONE[tone].block}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-2xs font-semibold opacity-80">{eyebrow}</p>}
          <p className="mt-1 font-serif text-3xl font-bold leading-tight tracking-tight">
            {headline}
          </p>
          {detail && <p className="mt-1.5 text-sm opacity-90">{detail}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
