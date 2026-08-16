import { selectDashboardCards, MVP_CARDS } from './dashboard.js';
import type { Role } from './roles.js';

describe('selectDashboardCards', () => {
  it('家長看得到 announcement/attendance/leave/message/communication-book，看不到 transportation（bus flag 關）', () => {
    const cards = selectDashboardCards(['PARENT'], {}, []);
    const ids = cards.map((c) => c.id);
    expect(ids).toEqual(['announcement', 'attendance', 'leave', 'message', 'communication-book']);
  });

  it('bus flag 開啟時，家長才看得到 transportation', () => {
    const ids = selectDashboardCards(['PARENT'], { bus: true }, []).map((c) => c.id);
    expect(ids).toContain('transportation');
  });

  it('requiredFeature 的卡片，flag 未設或為 false 時一律隱藏', () => {
    expect(selectDashboardCards(['BUS_TEACHER'], {}, []).map((c) => c.id)).not.toContain('transportation');
    expect(selectDashboardCards(['BUS_TEACHER'], { bus: false }, []).map((c) => c.id)).not.toContain(
      'transportation',
    );
  });

  it('一人多角色 → 取聯集（OWNER 無 message 卡，但兼具 PARENT 後可見）', () => {
    const ownerOnly = selectDashboardCards(['OWNER'], {}, []).map((c) => c.id);
    expect(ownerOnly).not.toContain('message');

    const ownerAndParent = selectDashboardCards(['OWNER', 'PARENT'], {}, []).map((c) => c.id);
    expect(ownerAndParent).toContain('message');
  });

  it('稽核卡只給 OWNER/ADMIN（家長看不到）', () => {
    expect(selectDashboardCards(['OWNER'], {}, []).map((c) => c.id)).toContain('audit');
    expect(selectDashboardCards(['ADMIN'], {}, []).map((c) => c.id)).toContain('audit');
    expect(selectDashboardCards(['PARENT'], {}, []).map((c) => c.id)).not.toContain('audit');
  });

  it('cardOrder 覆寫預設排序；未列入者置後並依 CardDescriptor.order', () => {
    const ids = selectDashboardCards(
      ['PARENT'],
      {},
      ['leave', 'announcement'], // 只指定前兩張的順序
    ).map((c) => c.id);
    expect(ids.slice(0, 2)).toEqual(['leave', 'announcement']);
    // 其餘（attendance/message/communication-book）未列入 → 置後、維持 order 遞增
    expect(ids.slice(2)).toEqual(['attendance', 'message', 'communication-book']);
  });

  it('無任何適用角色 → 回空陣列', () => {
    const noRoles: Role[] = [];
    expect(selectDashboardCards(noRoles, {}, [])).toEqual([]);
  });

  it('不改動輸入的 MVP_CARDS（純函式、回傳新陣列）', () => {
    const before = MVP_CARDS.map((c) => c.id);
    selectDashboardCards(['PARENT'], { bus: true }, ['leave']);
    expect(MVP_CARDS.map((c) => c.id)).toEqual(before);
  });
});
