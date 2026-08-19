'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 底部頁籤的預先載入（手感規範：「底部頁籤那幾頁閒置時先抓好資料」）。
//
// 為什麼有感：在 LINE 的內建瀏覽器裡，換頁最慢的一段不是 API，是**那一頁的 JS 還沒下載**。
// 底部四格是「一天內會重複去的地方」，使用者遲早都會點 —— 那就趁他還在讀首頁的時候先抓好。
//
// 用 requestIdleCallback 而不是 useEffect 直接抓：預先載入是「順便」，
// 不可以跟目前這一頁在搶頻寬。瀏覽器沒有這個 API（Safari 舊版）就退回一個短 timeout，
// 反正抓不到也只是回到現在的樣子。
//
// **刻意只預載路由（那一頁的程式），不預載資料。**
// 資料要預載就得知道每一支查詢的 key 與參數，而那些參數跟身分綁在一起
// （哪一班、哪個孩子）—— 猜錯就是替使用者發一支他沒有權限的請求，
// 在後端留下一筆 403 的稽核紀錄。省下的那幾百毫秒不值得。
// 資料本身有 30 秒的 staleTime（見 app/providers），真正重複去的頁面本來就不會每次重抓。

const IDLE_FALLBACK_MS = 1200;

type IdleHandle = number;

function onIdle(run: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => IdleHandle;
    cancelIdleCallback?: (handle: IdleHandle) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const handle = w.requestIdleCallback(run, { timeout: 3000 });
    return () => w.cancelIdleCallback?.(handle);
  }
  const timer = window.setTimeout(run, IDLE_FALLBACK_MS);
  return () => window.clearTimeout(timer);
}

/** 閒下來時把這幾條路由的程式先抓好。href 陣列請用穩定的來源（例如 PERSONA_TABS）。 */
export function useIdlePrefetch(hrefs: readonly string[]): void {
  const router = useRouter();
  // hrefs 每次 render 都是新陣列時，用內容當 key 才不會每次都重排一次預載。
  const key = hrefs.join('|');

  useEffect(() => {
    if (key === '') return;
    return onIdle(() => {
      for (const href of key.split('|')) {
        router.prefetch(href);
      }
    });
  }, [key, router]);
}
