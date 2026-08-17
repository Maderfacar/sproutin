import { describe, expect, it } from 'vitest';
import { resolveLiffStatePath } from './liffState';

// 圖文選單的每一格都靠這個把人帶到正確的頁面。
// 已登入的人不會跑 liff.init()，所以不能依賴 SDK 幫忙轉址。
describe('resolveLiffStatePath', () => {
  it('把 LINE 帶來的路徑接到 /liff 底下', () => {
    expect(resolveLiffStatePath('?liff.state=%2Fleave')).toBe('/liff/leave');
  });

  it('沒有前導斜線也接得起來', () => {
    expect(resolveLiffStatePath('?liff.state=communication-book')).toBe(
      '/liff/communication-book',
    );
  });

  it('已經是 /liff 開頭就不重複加', () => {
    expect(resolveLiffStatePath('?liff.state=%2Fliff%2Fattendance')).toBe('/liff/attendance');
  });

  it('保留查詢字串（例如帶碼的綁定連結）', () => {
    expect(resolveLiffStatePath('?liff.state=%2Fleave%3Fday%3Dtoday')).toBe(
      '/liff/leave?day=today',
    );
  });

  it('沒有指定目的地 → 留在原地', () => {
    expect(resolveLiffStatePath('')).toBeNull();
    expect(resolveLiffStatePath('?other=1')).toBeNull();
    expect(resolveLiffStatePath('?liff.state=%2F')).toBeNull();
  });

  it('擋掉站外轉址（否則等於開放任意跳轉）', () => {
    expect(resolveLiffStatePath('?liff.state=https%3A%2F%2Fevil.example')).toBeNull();
    expect(resolveLiffStatePath('?liff.state=%2F%2Fevil.example')).toBeNull();
    expect(resolveLiffStatePath('?liff.state=javascript%3Aalert(1)')).toBeNull();
  });
});
