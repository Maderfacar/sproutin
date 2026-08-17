import { BadRequestException } from '@nestjs/common';
import { RichMenuService, type RichMenuActor } from './rich-menu.service';
import { LineRichMenuError } from './line-rich-menu.client';
import { AuditService } from '../core/audit/audit.service';
import type { AuthUser } from '@sproutin/shared';

// 圖文選單：儲存（不碰 LINE）與套用（真的碰 LINE）。
// 套用的順序是有意義的 —— 先刪舊的會讓全園所在中途失敗時沒有選單可用。

const role = (r: AuthUser['roles'][number]['role']) => ({
  role: r,
  scopeType: 'SCHOOL' as const,
  scopeId: null,
});
const owner: RichMenuActor = { id: 'u-owner', roles: [role('OWNER')] };

const savedRow = (over: Record<string, unknown> = {}) => ({
  audience: 'PARENT',
  template: 'SIX',
  imageUrl: 'https://blob.example/menu.png',
  chatBarText: '開啟選單',
  items: [
    { index: 0, target: 'communication-book' },
    { index: 1, target: 'leave' },
  ],
  lineRichMenuId: null,
  appliedAt: null,
  ...over,
});

type TxMock = {
  richMenuConfig: { upsert: jest.Mock; update: jest.Mock };
  auditLog: { create: jest.Mock };
};

function makePrisma(row: unknown = savedRow()) {
  const tx: TxMock = {
    richMenuConfig: { upsert: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return {
    tx,
    richMenuConfig: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => row),
    },
    schoolConfig: { findFirst: jest.fn(async () => ({ liffId: '2011106015-hbS1EASz' })) },
    lineIdentity: {
      findMany: jest.fn(async () => [{ lineUserId: 'U1' }, { lineUserId: 'U2' }]),
    },
    $transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb(tx)),
  };
}

type LineMock = {
  enabled: boolean;
  createMenu: jest.Mock;
  uploadImage: jest.Mock;
  setDefault: jest.Mock;
  linkUsers: jest.Mock;
  linkUser: jest.Mock;
  deleteMenu: jest.Mock;
};

function makeLine(enabled = true): LineMock {
  return {
    enabled,
    createMenu: jest.fn(async () => 'rich-new'),
    uploadImage: jest.fn(async () => undefined),
    setDefault: jest.fn(async () => undefined),
    linkUsers: jest.fn(async () => ({ linked: 2, skipped: 0 })),
    linkUser: jest.fn(async () => undefined),
    deleteMenu: jest.fn(async () => undefined),
  };
}

// 產生一張真的能被讀出尺寸的 PNG 標頭（簽章 + IHDR 的 width/height）。
// 用真位元組而不是空 buffer，是因為 apply 現在會從圖片讀出實際尺寸當作選單尺寸。
function pngBytes(width: number, height: number): ArrayBuffer {
  const buf = new ArrayBuffer(64);
  const view = new DataView(buf);
  view.setUint32(0, 0x89504e47);
  view.setUint32(4, 0x0d0a1a0a);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return buf;
}

function mockImage(contentType = 'image/png', bytes = pngBytes(2500, 1686)): void {
  global.fetch = jest.fn(async () => ({
    ok: true,
    headers: { get: () => contentType },
    arrayBuffer: async () => bytes,
  })) as never;
}

function makeService(prisma: ReturnType<typeof makePrisma>, line: ReturnType<typeof makeLine>) {
  return new RichMenuService(prisma as never, new AuditService(prisma as never), line as never);
}

describe('RichMenuService.save', () => {
  const base = {
    template: 'SIX' as const,
    imageUrl: null,
    chatBarText: '開啟選單',
    items: [{ index: 0, target: 'leave' as const }],
  };

  it('儲存設計不會碰到 LINE（園長調版面會存很多次，而建立選單有每小時 100 次上限）', async () => {
    const prisma = makePrisma();
    const line = makeLine();
    await makeService(prisma, line).save(owner, 'PARENT', base);

    expect(prisma.tx.richMenuConfig.upsert).toHaveBeenCalledTimes(1);
    expect(line.createMenu).not.toHaveBeenCalled();
  });

  it('聊天列文字超過 LINE 的 14 字上限 → 400', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma, makeLine()).save(owner, 'PARENT', {
        ...base,
        chatBarText: '這行字實在是太長了會被 LINE 拒絕掉喔',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('同一格被設定兩次 → 400', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma, makeLine()).save(owner, 'PARENT', {
        ...base,
        items: [
          { index: 0, target: 'leave' },
          { index: 0, target: 'announcement' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('格子超出這個版面的範圍 → 400（兩格版面沒有第 5 格）', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma, makeLine()).save(owner, 'PARENT', {
        ...base,
        template: 'TWO',
        items: [{ index: 4, target: 'leave' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('娃娃車點名放進家長的選單 → 400（家長按下去只會撞到權限牆）', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma, makeLine()).save(owner, 'PARENT', {
        ...base,
        items: [{ index: 0, target: 'bus' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('娃娃車點名放進教職員的選單 → 可以', async () => {
    const prisma = makePrisma();
    await makeService(prisma, makeLine()).save(owner, 'STAFF', {
      ...base,
      items: [{ index: 0, target: 'bus' }],
    });

    expect(prisma.tx.richMenuConfig.upsert).toHaveBeenCalledTimes(1);
  });

  it('一格都沒設定 → 400（點下去什麼都不會發生，比沒有選單更糟）', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma, makeLine()).save(owner, 'PARENT', { ...base, items: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('稽核只記數量與版面，不記底圖網址', async () => {
    const prisma = makePrisma();
    await makeService(prisma, makeLine()).save(owner, 'PARENT', {
      ...base,
      imageUrl: 'https://blob.example/secret.png',
    });
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('rich_menu.save');
    expect(JSON.stringify(entry.metadata)).not.toContain('secret.png');
  });
});

describe('RichMenuService.apply', () => {
  beforeEach(() => mockImage());

  it('沒有設定 LINE 權杖 → 明說沒設定，而不是假裝成功', async () => {
    const service = makeService(makePrisma(), makeLine(false));
    await expect(service.apply(owner, 'PARENT')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('沒有底圖 → 提早擋下（LINE 會在綁定時以 400 拒絕沒有圖的選單）', async () => {
    const prisma = makePrisma(savedRow({ imageUrl: null }));
    const line = makeLine();
    await expect(makeService(prisma, line).apply(owner, 'PARENT')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(line.createMenu).not.toHaveBeenCalled();
  });

  it('底圖超過 LINE 的 1MB 上限 → 400', async () => {
    mockImage('image/png', new ArrayBuffer(1024 * 1024 + 1));
    const line = makeLine();
    await expect(makeService(makePrisma(), line).apply(owner, 'PARENT')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(line.createMenu).not.toHaveBeenCalled();
  });

  it('太方的底圖先擋在自己這關（LINE 要求寬/高 ≥1.45，且它的錯誤訊息很難懂）', async () => {
    mockImage('image/png', pngBytes(1000, 1000));
    const line = makeLine();
    await expect(makeService(makePrisma(), line).apply(owner, 'PARENT')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(line.createMenu).not.toHaveBeenCalled();
  });

  it('太窄的底圖（寬 < 800）→ 400', async () => {
    mockImage('image/png', pngBytes(600, 300));
    await expect(
      makeService(makePrisma(), makeLine()).apply(owner, 'PARENT'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('選單尺寸＝底圖的實際尺寸（LINE 要求兩者一致;寫死會逼園所去湊圖）', async () => {
    mockImage('image/png', pngBytes(1200, 800));
    const line = makeLine();
    await makeService(makePrisma(), line).apply(owner, 'PARENT');

    const payload = line.createMenu.mock.calls[0][0];
    expect(payload.size).toEqual({ width: 1200, height: 800 });
    // 六格 → 3 欄 2 列；最後一欄吃掉餘數，不留下點不到的縫。
    expect(payload.areas[0].bounds).toEqual({ x: 0, y: 0, width: 400, height: 400 });
  });

  it('LINE 拒絕時翻成看得懂的 400，而不是 INTERNAL_ERROR', async () => {
    const line = makeLine();
    line.createMenu.mockRejectedValue(
      new LineRichMenuError(400, '{"message":"invalid richmenu image"}'),
    );
    await expect(
      makeService(makePrisma(), line).apply(owner, 'PARENT'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('底圖不是 JPEG 或 PNG → 400', async () => {
    mockImage('image/webp');
    await expect(
      makeService(makePrisma(), makeLine()).apply(owner, 'PARENT'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('每一格連到帶路徑的 LIFF 網址', async () => {
    const line = makeLine();
    await makeService(makePrisma(), line).apply(owner, 'PARENT');

    const payload = line.createMenu.mock.calls[0][0];
    expect(payload.areas[0].action.uri).toBe(
      'https://liff.line.me/2011106015-hbS1EASz/communication-book',
    );
    expect(payload.size).toEqual({ width: 2500, height: 1686 });
  });

  it('家長版：綁給有 LINE 的家長，不設成預設選單', async () => {
    const line = makeLine();
    await makeService(makePrisma(), line).apply(owner, 'PARENT');

    expect(line.linkUsers).toHaveBeenCalledWith('rich-new', ['U1', 'U2']);
    expect(line.setDefault).not.toHaveBeenCalled();
  });

  it('未綁定版：設成預設選單（我們還不知道那些人是誰，無從逐一綁定）', async () => {
    const prisma = makePrisma(savedRow({ audience: 'UNBOUND', template: 'TWO' }));
    const line = makeLine();
    const result = await makeService(prisma, line).apply(owner, 'UNBOUND');

    expect(line.setDefault).toHaveBeenCalledWith('rich-new');
    expect(line.linkUsers).not.toHaveBeenCalled();
    expect(result.linkedUsers).toBe(0);
  });

  it('先建新的、上傳圖、綁人，**最後**才刪舊的（先刪會讓中途失敗時全園所沒有選單）', async () => {
    const order: string[] = [];
    const line = makeLine();
    line.createMenu.mockImplementation(async () => {
      order.push('create');
      return 'rich-new';
    });
    line.uploadImage.mockImplementation(async () => {
      order.push('upload');
    });
    line.linkUsers.mockImplementation(async () => {
      order.push('link');
      return { linked: 2, skipped: 0 };
    });
    line.deleteMenu.mockImplementation(async () => {
      order.push('delete');
    });

    const prisma = makePrisma(savedRow({ lineRichMenuId: 'rich-old' }));
    await makeService(prisma, line).apply(owner, 'PARENT');

    expect(order).toEqual(['create', 'upload', 'link', 'delete']);
    expect(line.deleteMenu).toHaveBeenCalledWith('rich-old');
  });

  it('第一次套用沒有舊選單可刪', async () => {
    const line = makeLine();
    await makeService(makePrisma(), line).apply(owner, 'PARENT');
    expect(line.deleteMenu).not.toHaveBeenCalled();
  });

  it('被 LINE 略過的人數如實回報（demo 假資料、已刪帳號、未加好友）', async () => {
    const line = makeLine();
    line.linkUsers.mockResolvedValue({ linked: 1, skipped: 1 });
    const result = await makeService(makePrisma(), line).apply(owner, 'PARENT');

    expect(result).toMatchObject({ linkedUsers: 1, skippedUsers: 1 });
  });

  it('稽核記對象與人數，不記 lineUserId', async () => {
    const prisma = makePrisma();
    await makeService(prisma, makeLine()).apply(owner, 'PARENT');
    const entry = prisma.tx.auditLog.create.mock.calls[0][0].data;
    expect(entry.action).toBe('rich_menu.apply');
    expect(entry.metadata).toMatchObject({ audience: 'PARENT', linkedUsers: 2 });
    expect(JSON.stringify(entry.metadata)).not.toContain('U1');
  });
});
