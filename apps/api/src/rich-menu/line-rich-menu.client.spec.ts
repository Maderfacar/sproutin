import { LineRichMenuClient, LineRichMenuError } from './line-rich-menu.client';

// 批次綁定的失敗處理。
// 教訓來源：先前公告推播曾因「單一無效收件人中斷整批」而讓排在後面的家長永遠收不到。
// LINE 官方也明講：批次綁定回錯誤時，**沒有任何人**被綁定 —— 所以一個壞 ID 會害到全部人。

function makeClient(): LineRichMenuClient {
  process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = 'test-token';
  return new LineRichMenuClient();
}

const ok = { ok: true, json: async () => ({}), text: async () => '' };
const bad = (status: number) => ({
  ok: false,
  status,
  text: async () => '{"message":"invalid"}',
});

describe('LineRichMenuClient.linkUsers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('整批成功 → 一次呼叫搞定，沒有人被略過', async () => {
    const fetchMock = jest.fn(async () => ok);
    global.fetch = fetchMock as never;

    const result = await makeClient().linkUsers('rich-1', ['U1', 'U2', 'U3']);

    expect(result).toEqual({ linked: 3, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('整批被拒（含無效 ID）→ 改逐一綁定，其餘的人照樣拿到選單', async () => {
    let call = 0;
    global.fetch = jest.fn(async () => {
      call += 1;
      if (call === 1) return bad(400); // 整批
      if (call === 3) return bad(400); // 第二個人的 ID 無效
      return ok;
    }) as never;

    const result = await makeClient().linkUsers('rich-1', ['U1', 'Udemo_bad', 'U3']);

    expect(result).toEqual({ linked: 2, skipped: 1 });
  });

  it('LINE 伺服器錯誤（5xx）不當成「這個人不行」—— 往上丟，不要假裝成功', async () => {
    let call = 0;
    global.fetch = jest.fn(async () => {
      call += 1;
      return call === 1 ? bad(400) : bad(503);
    }) as never;

    await expect(makeClient().linkUsers('rich-1', ['U1'])).rejects.toBeInstanceOf(
      LineRichMenuError,
    );
  });

  it('沒有人要綁時不呼叫 LINE', async () => {
    const fetchMock = jest.fn(async () => ok);
    global.fetch = fetchMock as never;

    const result = await makeClient().linkUsers('rich-1', []);

    expect(result).toEqual({ linked: 0, skipped: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
