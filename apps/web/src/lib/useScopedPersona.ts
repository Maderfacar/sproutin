'use client';

import { usePathname } from 'next/navigation';
import { useActivePersona } from './usePersona';
import { surfaceOf } from './surface';
import type { Persona } from './persona';

// 「現在要用**哪一種身分**來縮小範圍。」全站只有這一個地方回答這個問題。
//
// 三個東西都問它：
//   useVisibleStudents() / useVisibleClasses()   這個身分看得到哪些資料
//   useCapabilities()                            這個身分看得到哪些入口
//
// **回 null ＝不套身分**（用角色聯集）。目前只有一種情況：桌面後台 `/admin/*`。
//
// 為什麼桌面要例外：身分是**手機殼**的概念（三套殼、底部四格），桌面後台沒有那層外框；
// 而且身分記在 localStorage 是**跨外框共用**的 —— 園長昨天在手機上切到家長身分，
// 今天打開電腦後台，點名頁只會列出他自己的小孩、公告頁沒有發布鈕、人員管理整片空白。
// 那不是「切身分」，那是壞掉。
//
// 判斷用 `surfaceOf(pathname)`，**不由呼叫端傳 prop**：兩個十行的 page.tsx 各要記得傳一次，
// 遲早漏一個（與 components/SplitColumns 同一條理由）。
export function useScopedPersona(): Persona | null {
  const { persona } = useActivePersona();
  // usePathname() 在某些 Next 的情境下會是 null（例如還沒進到路由樹的元件）。
  // 那時當作手機外框 —— 桌面後台一定有路徑，不會走到這裡。
  const pathname = usePathname() ?? '';
  return surfaceOf(pathname) === 'admin' ? null : persona;
}
