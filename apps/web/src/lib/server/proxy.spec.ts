import { describe, it, expect, beforeEach, vi } from 'vitest';
import { proxyToApi } from './proxy';

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => ({ value: 'jwt-token' }) }),
}));

const upstream = vi.hoisted(() => ({
  status: 200,
  body: '{"ok":true}',
}));

beforeEach(() => {
  upstream.status = 200;
  upstream.body = '{"ok":true}';
  process.env.API_INTERNAL_URL = 'http://api.internal';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(upstream.body || null, { status: upstream.status })),
  );
});

function request(method = 'GET'): Request {
  return new Request('http://localhost/api/users/u1/line', { method });
}

describe('proxyToApi', () => {
  it('一般回應照原狀轉回去', async () => {
    const res = await proxyToApi(request(), '/users/u1/line');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
  });

  // 這是 Human Owner 2026-08-20 回報「解除 LINE 綁定 → 操作失敗（HTTP_500）」的根因：
  // 204 依規格不能帶 body，硬塞一個（就算是空字串）Response 建構子會直接丟錯，
  // Next 這一層就回 500 —— 後端其實已經做完了，而且 mutation 的 onSuccess 不會跑。
  // **所有 DELETE 端點都走這條路**，不只綁定。
  it('204 不帶 body，也不會炸掉', async () => {
    upstream.status = 204;
    upstream.body = '';

    const res = await proxyToApi(request('DELETE'), '/users/u1/line');

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  it('205 與 304 同樣不帶 body', async () => {
    for (const status of [205, 304]) {
      upstream.status = status;
      upstream.body = '';
      const res = await proxyToApi(request('DELETE'), '/x');
      expect(res.status).toBe(status);
    }
  });

  // 後端回 200 但空 body 也不該讓 proxy 掛掉。
  it('空 body 的成功回應照樣轉得回去', async () => {
    upstream.status = 200;
    upstream.body = '';
    const res = await proxyToApi(request(), '/x');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('錯誤回應的 body 要保留（前端要從裡面讀錯誤碼）', async () => {
    upstream.status = 409;
    upstream.body = '{"error":{"code":"guardianship_exists"}}';
    const res = await proxyToApi(request('POST'), '/guardianships');
    expect(res.status).toBe(409);
    expect(await res.text()).toContain('guardianship_exists');
  });

  it('沒設定後端網址時回 503，不會把請求丟出去', async () => {
    delete process.env.API_INTERNAL_URL;
    const res = await proxyToApi(request(), '/x');
    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});
