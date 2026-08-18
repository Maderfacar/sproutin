'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// 換頁的方向感（Human Owner 2026-08-18 定案：B1 前三件之一）。
//
// 現在點進聯絡簿是「硬切」—— 畫面瞬間換掉，腦袋要重新找位置。
// 原生 app 的作法是：進去的頁面從右邊滑進來，返回的時候從左邊滑回去，
// 方向本身就在講「你往裡面走了」或「你退回來了」。
//
// 怎麼分辨前進與返回：瀏覽器（含 LINE 內建瀏覽器）的返回會先發 popstate。
// 收到 popstate 就把下一次的路徑變化記成「返回」，用完歸零。
// 判斷不出來時一律當前進 —— 猜錯方向只是動畫方向反了，不會壞掉。
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pendingBack = useRef(false);
  const direction = useRef<'forward' | 'back'>('forward');
  const lastPath = useRef(pathname);

  useEffect(() => {
    const onPopState = (): void => {
      pendingBack.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // 在 render 當下就要決定方向 —— 放進 useEffect 的話動畫會先用舊方向跑起來再改。
  if (lastPath.current !== pathname) {
    direction.current = pendingBack.current ? 'back' : 'forward';
    pendingBack.current = false;
    lastPath.current = pathname;
  }

  // key 換掉才會重新播動畫。
  return (
    <div key={pathname} className={direction.current === 'back' ? 'page-back' : 'page-forward'}>
      {children}
    </div>
  );
}
