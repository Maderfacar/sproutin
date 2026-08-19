import { describe, it, expect } from 'vitest';
import { isRouteForPersona, PERSONA_HOME } from './personaRoutes';

// 切換身分之後「留在原地」什麼時候是對的、什麼時候是錯的。
//
// Human Owner 2026-08-20 回報：園長在人員管理頁上切成家長身分，那一頁還留在畫面上。
// 但**大部分的頁面留在原地才對** —— 那正是「同一個網址，依身分渲染不同的頁」的設計。
// 所以這支列的是例外，而測試要同時釘住「哪些該退」與「哪些不該退」。

describe('isRouteForPersona', () => {
  it('後台與稽核只有園長站得住', () => {
    for (const path of ['/liff/admin/people', '/liff/admin/students', '/liff/audit']) {
      expect(isRouteForPersona(path, 'staff')).toBe(true);
      expect(isRouteForPersona(path, 'parent')).toBe(false);
      expect(isRouteForPersona(path, 'teacher')).toBe(false);
      expect(isRouteForPersona(path, 'bus')).toBe(false);
    }
  });

  it('我的班是導師專屬', () => {
    expect(isRouteForPersona('/liff/class', 'teacher')).toBe(true);
    expect(isRouteForPersona('/liff/class', 'parent')).toBe(false);
    expect(isRouteForPersona('/liff/class', 'staff')).toBe(false);
  });

  // 學生整合視圖是校方查一個孩子的地方；家長看自己小孩走聯絡簿那條路。
  it('學生整合視圖給校方，不給家長', () => {
    expect(isRouteForPersona('/liff/student/abc', 'staff')).toBe(true);
    expect(isRouteForPersona('/liff/student/abc', 'teacher')).toBe(true);
    expect(isRouteForPersona('/liff/student/abc', 'parent')).toBe(false);
  });

  // 這幾條是「同一個網址依身分渲染不同的頁」，切過去要留在原地 ——
  // 家長切成老師之後被踢回首頁，比留在原地更莫名其妙。
  it('依身分渲染不同內容的那些頁，每一種身分都站得住', () => {
    const shared = [
      '/liff',
      '/liff/leave',
      '/liff/attendance',
      '/liff/communication-book',
      '/liff/communication-book/stu-1',
      '/liff/announcement',
      '/liff/notification',
      '/liff/bus',
      '/liff/me',
    ];
    for (const path of shared) {
      for (const persona of ['parent', 'teacher', 'staff', 'bus'] as const) {
        expect(isRouteForPersona(path, persona), `${path} / ${persona}`).toBe(true);
      }
    }
  });

  // 前綴必須停在路徑邊界，否則 /liff/classroom 這種網址會被 /liff/class 誤中。
  it('前綴比對停在路徑邊界', () => {
    expect(isRouteForPersona('/liff/classroom', 'parent')).toBe(true);
    expect(isRouteForPersona('/liff/administration', 'parent')).toBe(true);
  });

  it('退回去的地方是首頁 —— 每一種身分同一個網址，內容才不同', () => {
    expect(PERSONA_HOME).toBe('/liff');
    for (const persona of ['parent', 'teacher', 'staff', 'bus'] as const) {
      expect(isRouteForPersona(PERSONA_HOME, persona)).toBe(true);
    }
  });
});
