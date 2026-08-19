import { describe, it, expect } from 'vitest';
import { runBatched } from './bulk';

describe('runBatched', () => {
  it('每一筆都跑到，回報成功的清單', async () => {
    const seen: number[] = [];
    const result = await runBatched([1, 2, 3, 4, 5], async (n) => {
      seen.push(n);
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.ok.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.failed).toEqual([]);
  });

  // 對外部 API 的批次動作，單一失敗絕不可中斷整批（Phase 9 公告推播的教訓）。
  it('中間有人失敗，其他人照樣跑完', async () => {
    const done: number[] = [];
    const result = await runBatched([1, 2, 3, 4], async (n) => {
      if (n === 2) throw new Error('壞掉了');
      done.push(n);
    });

    expect(done.sort()).toEqual([1, 3, 4]);
    expect(result.ok.sort()).toEqual([1, 3, 4]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.item).toBe(2);
  });

  // 手機在 LINE 內建瀏覽器上同時開太多條連線，後面的會排隊排到逾時。
  it('同時進行的數量不超過上限', async () => {
    let running = 0;
    let peak = 0;
    await runBatched(
      Array.from({ length: 12 }, (_, i) => i),
      async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 1));
        running -= 1;
      },
      3,
    );

    expect(peak).toBeLessThanOrEqual(3);
  });

  it('空清單直接結束，不會卡住', async () => {
    const result = await runBatched([], async () => {});
    expect(result.ok).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('上限比項目多的時候不會開出多餘的工人', async () => {
    const result = await runBatched([1, 2], async () => {}, 10);
    expect(result.ok).toHaveLength(2);
  });
});
