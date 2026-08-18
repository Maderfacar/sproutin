import { collectIds, summarize, type SummaryLookups } from './notification-summary';

function lookups(over: Partial<SummaryLookups> = {}): SummaryLookups {
  return {
    studentNames: new Map([['stu-1', '小宇']]),
    announcementTitles: new Map([['ann-1', { title: '校外教學通知單', schoolWide: true }]]),
    messageBodies: new Map([['msg-1', '小宇今天午睡很好，點心也吃完了']]),
    userNames: new Map([['usr-1', '王老師']]),
    ...over,
  };
}

describe('notification-summary', () => {
  describe('collectIds', () => {
    it('去重、略過缺欄位與壞型別', () => {
      const ids = collectIds(
        [
          { payload: { studentId: 'stu-1' } },
          { payload: { studentId: 'stu-1' } },
          { payload: { studentId: 'stu-2' } },
          { payload: { announcementId: 'ann-1' } },
          { payload: { studentId: 123 } },
          { payload: null },
          { payload: 'not-an-object' },
        ],
        'studentId',
      );
      expect(ids).toEqual(['stu-1', 'stu-2']);
    });
  });

  describe('公告', () => {
    it('顯示公告本身的標題，並分辨全校/班級', () => {
      expect(
        summarize({ type: 'AnnouncementPublished', payload: { announcementId: 'ann-1' } }, lookups()),
      ).toEqual({ title: '校外教學通知單', subtitle: '全校公告' });
    });

    it('公告已被刪除 → 退回分類名稱，不是空白', () => {
      expect(
        summarize({ type: 'AnnouncementPublished', payload: { announcementId: 'gone' } }, lookups()),
      ).toEqual({ title: '有新公告', subtitle: '公告' });
    });
  });

  describe('聯絡簿留言', () => {
    it('顯示「發話者：內容摘要」', () => {
      const r = summarize(
        { type: 'MessageSent', payload: { messageId: 'msg-1', senderId: 'usr-1', studentId: 'stu-1' } },
        lookups(),
      );
      expect(r.title).toBe('王老師：小宇今天午睡很好，點心也吃完了');
      expect(r.subtitle).toBe('聯絡簿留言 · 小宇');
    });

    it('留言太長時截斷，不讓一行撐爆版面', () => {
      const long = 'あ'.repeat(80);
      const r = summarize(
        { type: 'MessageSent', payload: { messageId: 'msg-1', senderId: 'usr-1' } },
        lookups({ messageBodies: new Map([['msg-1', long]]) }),
      );
      expect(r.title.endsWith('…')).toBe(true);
      expect(r.title.length).toBeLessThan(40);
    });

    it('發話者查不到 → 只顯示摘要，不顯示 undefined', () => {
      const r = summarize(
        { type: 'MessageSent', payload: { messageId: 'msg-1', senderId: 'gone' } },
        lookups(),
      );
      expect(r.title).toBe('小宇今天午睡很好，點心也吃完了');
    });
  });

  describe('請假', () => {
    it('帶學生姓名與日期區間', () => {
      const r = summarize(
        {
          type: 'LeaveApproved',
          payload: {
            studentId: 'stu-1',
            dateFrom: '2026-03-12T00:00:00.000Z',
            dateTo: '2026-03-14T00:00:00.000Z',
          },
        },
        lookups(),
      );
      expect(r.title).toBe('小宇 3/12–3/14 請假已核准');
      expect(r.subtitle).toBe('請假 · 小宇');
    });

    it('單日不重複印兩次日期', () => {
      const r = summarize(
        {
          type: 'LeaveApproved',
          payload: {
            studentId: 'stu-1',
            dateFrom: '2026-03-12T00:00:00.000Z',
            dateTo: '2026-03-12T00:00:00.000Z',
          },
        },
        lookups(),
      );
      expect(r.title).toBe('小宇 3/12 請假已核准');
    });

    it('沒有日期時仍講得出是什麼事', () => {
      const r = summarize({ type: 'LeaveRejected', payload: { studentId: 'stu-1' } }, lookups());
      expect(r.title).toBe('小宇 請假已駁回');
    });
  });

  describe('聯絡簿送出', () => {
    it('帶孩子名字與日期', () => {
      const r = summarize(
        {
          type: 'CommunicationBookPublished',
          payload: { studentId: 'stu-1', date: '2026-03-12T00:00:00.000Z' },
        },
        lookups(),
      );
      expect(r.title).toBe('小宇 3/12 的聯絡簿已送出');
    });

    it('學生查不到時不顯示 undefined', () => {
      const r = summarize(
        { type: 'CommunicationBookPublished', payload: { studentId: 'gone' } },
        lookups(),
      );
      expect(r.title).toBe('孩子的聯絡簿已送出');
      expect(r.title).not.toContain('undefined');
    });
  });

  it('沒見過的 type 也不會回空白', () => {
    const r = summarize({ type: 'SomethingNew', payload: {} }, lookups());
    expect(r.title).toBe('SomethingNew');
    expect(r.subtitle).toBe('通知');
  });

  it('payload 是壞資料時不丟例外', () => {
    expect(() => summarize({ type: 'LeaveApproved', payload: null }, lookups())).not.toThrow();
    expect(() => summarize({ type: 'MessageSent', payload: [1, 2] }, lookups())).not.toThrow();
  });
});
