import { describe, it, expect } from 'vitest';
import { notificationHref, notificationIcon } from './target';
import { relativeTime } from './relativeTime';

describe('notificationHref', () => {
  it('公告 → 公告頁', () => {
    expect(notificationHref('AnnouncementPublished', { announcementId: 'a1' })).toBe(
      '/liff/announcement',
    );
  });

  // 親師對話併在聯絡簿裡（Human Owner 決策），所以留言要回到那個孩子的聯絡簿。
  it('聯絡簿留言 → 那個孩子的聯絡簿', () => {
    expect(notificationHref('MessageSent', { studentId: 'stu-1' })).toBe(
      '/liff/communication-book/stu-1',
    );
  });

  it('沒有 studentId → 退回聯絡簿列表，不產生壞網址', () => {
    expect(notificationHref('MessageSent', {})).toBe('/liff/communication-book');
    expect(notificationHref('CommunicationBookPublished', null)).toBe('/liff/communication-book');
  });

  it('四種請假通知都回請假頁', () => {
    for (const t of ['LeaveSubmitted', 'LeaveApproved', 'LeaveRejected', 'LeaveCancelled']) {
      expect(notificationHref(t, {})).toBe('/liff/leave');
    }
  });

  it('出缺勤衝突 → 出缺勤頁', () => {
    expect(notificationHref('attendance.override_conflict', {})).toBe('/liff/attendance');
  });

  // 畫成連結卻按了沒反應，比畫成不可點更糟。
  it('沒見過的 type → null（呼叫端要畫成不可點）', () => {
    expect(notificationHref('SomethingNew', {})).toBeNull();
  });

  // href 一律寫手機版網址，桌面版由 SurfaceLink 翻譯（docs/04 §3b）。
  it('回傳的一律是手機版網址', () => {
    const hrefs = ['AnnouncementPublished', 'MessageSent', 'LeaveApproved', 'AttendanceMarked']
      .map((t) => notificationHref(t, { studentId: 's1' }))
      .filter((h): h is string => h !== null);
    expect(hrefs.every((h) => h.startsWith('/liff/'))).toBe(true);
  });
});

describe('notificationIcon', () => {
  it('每種 type 都給得出圖示，未知的退回鈴鐺', () => {
    expect(notificationIcon('AnnouncementPublished')).toBe('mega');
    expect(notificationIcon('MessageSent')).toBe('chat');
    expect(notificationIcon('SomethingNew')).toBe('bell');
  });
});

describe('relativeTime', () => {
  // 一律寫出 +08:00：時間顯示以園所時區（台灣）為準，測試不能跟著跑測試的機器的時區跑
  //（CI 是 UTC，開發機是台灣 —— 不寫死就會有一邊紅）。
  const now = new Date('2026-08-18T15:00:00+08:00');

  it('一分鐘內＝剛剛', () => {
    expect(relativeTime('2026-08-18T14:59:30+08:00', now)).toBe('剛剛');
  });

  it('一小時內＝幾分鐘前', () => {
    expect(relativeTime('2026-08-18T14:20:00+08:00', now)).toBe('40 分鐘前');
  });

  it('今天稍早＝時分（台灣時間）', () => {
    expect(relativeTime('2026-08-18T09:15:00+08:00', now)).toBe('09:15');
  });

  it('昨天有標「昨天」', () => {
    expect(relativeTime('2026-08-17T09:15:00+08:00', now)).toBe('昨天 09:15');
  });

  it('更早＝月/日；跨年才補年份', () => {
    expect(relativeTime('2026-03-12T09:15:00+08:00', now)).toBe('3/12');
    expect(relativeTime('2025-12-24T09:15:00+08:00', now)).toBe('2025/12/24');
  });

  // 伺服器與手機時鐘差幾秒是常態，不該顯示「-1 分鐘前」。
  it('未來時間當成剛剛', () => {
    expect(relativeTime('2026-08-18T15:00:20+08:00', now)).toBe('剛剛');
  });

  it('壞時間字串不丟例外', () => {
    expect(relativeTime('not-a-date', now)).toBe('');
  });

  // 這是 Human Owner 2026-08-19 回報的病灶：UTC 的時鐘比台灣慢 8 小時。
  it('UTC 時間戳換算成台灣時間，不是原封不動印出來', () => {
    expect(relativeTime('2026-08-18T01:15:00.000Z', now)).toBe('09:15');
  });

  // 台灣早上 7 點（UTC 前一天 23 點）：照 UTC 算會變成「昨天」。
  it('清晨的訊息算今天，不會被算成昨天', () => {
    const morning = new Date('2026-08-18T09:00:00+08:00');
    expect(relativeTime('2026-08-18T07:00:00+08:00', morning)).toBe('07:00');
  });
});
