import type { Prisma } from '@sproutin/db';
import { resolveCampaignRecipients } from './campaign-audience';

// 收件人解析（純函式）。重點在：只算已綁定 LINE 的人為「會收到」、未綁定的人要另外報數字、
// 停用帳號不收群發、以及「指定班級」不會意外多發給該班老師。

type Row = { lineIdentity: { lineUserId: string } | null };

function makeTx(rows: Row[]): { tx: Prisma.TransactionClient; whereOf: () => unknown } {
  let captured: unknown;
  const tx = {
    user: {
      findMany: jest.fn(async ({ where }: { where: unknown }) => {
        captured = where;
        return rows;
      }),
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, whereOf: () => captured };
}

describe('resolveCampaignRecipients', () => {
  it('已綁定的算「會收到」，未綁定的另外報數字', async () => {
    const { tx } = makeTx([
      { lineIdentity: { lineUserId: 'L-1' } },
      { lineIdentity: null },
      { lineIdentity: { lineUserId: 'L-2' } },
    ]);

    const r = await resolveCampaignRecipients(tx, 'ALL_PARENTS', null);

    expect(r.lineUserIds).toEqual(['L-1', 'L-2']);
    expect(r.unboundCount).toBe(1);
  });

  it('一律只找在職／在園的帳號（停用者不收群發）', async () => {
    const { tx, whereOf } = makeTx([]);
    await resolveCampaignRecipients(tx, 'ALL_PARENTS', null);

    expect(whereOf()).toMatchObject({ status: 'ACTIVE' });
  });

  // 只看身分欄位會出現反直覺的結果：有人收得到班級群發卻收不到全校群發
  // （班級是靠 Guardianship 認定的）。聯集讓「某班家長 ⊆ 全校家長」必然成立。
  it('全校家長 → 有家長身分 或 有在學學生的監護關聯（聯集）', async () => {
    const { tx, whereOf } = makeTx([]);
    await resolveCampaignRecipients(tx, 'ALL_PARENTS', null);

    expect(whereOf()).toMatchObject({
      OR: [
        { roles: { some: { role: { in: ['PARENT', 'GUARDIAN'] } } } },
        { guardianOf: { some: { student: { status: 'ACTIVE' } } } },
      ],
    });
  });

  // 後台補了監護關係卻忘了給「家長」身分 —— 這種人以前收不到全校群發。
  it('只有監護關聯、沒有家長身分的人也算全校家長', async () => {
    const { tx, whereOf } = makeTx([]);
    await resolveCampaignRecipients(tx, 'ALL_PARENTS', null);

    const or = (whereOf() as { OR: unknown[] }).OR;
    expect(or).toHaveLength(2);
    expect(JSON.stringify(or)).toContain('guardianOf');
  });

  it('教職員 → 園長／行政／老師／隨車老師', async () => {
    const { tx, whereOf } = makeTx([]);
    await resolveCampaignRecipients(tx, 'STAFF', null);

    expect(whereOf()).toMatchObject({
      roles: { some: { role: { in: ['OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER'] } } },
    });
  });

  // 勾一個班卻連該班老師一起發，園長不會預期 —— 老師走「教職員」那個選項。
  it('指定班級 → 只找該班在學學生的監護人，不含該班老師', async () => {
    const { tx, whereOf } = makeTx([]);
    await resolveCampaignRecipients(tx, 'CLASS', 'class-sun');

    expect(whereOf()).toMatchObject({
      guardianOf: { some: { student: { classId: 'class-sun', status: 'ACTIVE' } } },
    });
    expect(whereOf()).not.toHaveProperty('roles');
  });

  it('班級沒有任何在學學生 → 0 人，不是錯誤', async () => {
    const { tx } = makeTx([]);
    const r = await resolveCampaignRecipients(tx, 'CLASS', 'class-empty');

    expect(r).toEqual({ lineUserIds: [], unboundCount: 0 });
  });
});
