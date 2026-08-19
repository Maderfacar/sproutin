// 批次送出的執行器。純函式，方便測試。
//
// 為什麼需要它：點名的真實流程是「九成的孩子都到了」，所以最有價值的按鈕是
// 「剩下的全部標到校」。但後端一次只收一個人（POST /attendance），
// 一個 25 人的班就是 25 個請求 —— 直接 Promise.all 全部丟出去有兩個問題：
//
//   ① 手機在 LINE 內建瀏覽器上同時開 25 條連線，後面的會排隊排到逾時。
//   ② 任何一個失敗都不該讓其他人也沒點到 —— 點名是一個一個獨立的事實。
//
// 所以：限制同時進行的數量，且**每一筆各自成敗**，最後回報成功與失敗各幾筆。
// 呼叫端據此決定要說「全部完成」還是「有 2 位沒成功，再試一次」。

/** 同時最多幾條請求。4 是手機上不會塞車、又比一條一條快很多的折衷。 */
export const BULK_CONCURRENCY = 4;

export interface BulkResult<T> {
  ok: T[];
  failed: { item: T; error: unknown }[];
}

// 依序取用 items，最多同時 limit 條。全部跑完才 resolve —— 中途失敗不中斷其他人。
//
// 對外部 API 的批次動作絕不可因單一失敗而中斷整批（Phase 9 公告推播的教訓：
// 逐一 await 且任一失敗即整批中斷，排在後面的收件人永遠收不到）。
export async function runBatched<T>(
  items: readonly T[],
  run: (item: T) => Promise<unknown>,
  limit: number = BULK_CONCURRENCY,
): Promise<BulkResult<T>> {
  const result: BulkResult<T> = { ok: [], failed: [] };
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index] as T;
      try {
        await run(item);
        result.ok.push(item);
      } catch (error) {
        result.failed.push({ item, error });
      }
    }
  };

  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker);
  await Promise.all(workers);
  return result;
}
