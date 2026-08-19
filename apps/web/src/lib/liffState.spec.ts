import { describe, expect, it } from 'vitest';
import { liffRedirectFor, resolveLiffStatePath } from './liffState';

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

// 這一層決定 /liff 的外框要不要顯示「轉址中」的轉圈圈畫面。
// 只設不清就會永遠停在載入中 —— 從 LINE 圖文選單點進來完全打不開。
describe('liffRedirectFor', () => {
  it('圖文選單指定了目的頁 → 轉過去', () => {
    expect(liffRedirectFor('?liff.state=%2Fleave', '/liff')).toBe('/liff/leave');
  });

  it('已經到站 → 回 null（呼叫端才有機會關掉「轉址中」，不然永遠停在載入中）', () => {
    expect(liffRedirectFor('', '/liff/leave')).toBeNull();
    expect(liffRedirectFor('?day=today', '/liff/leave')).toBeNull();
    expect(liffRedirectFor('?liff.state=%2Fleave', '/liff/leave')).toBeNull();
  });

  it('保留網址上其餘的 query，只丟掉 liff.state', () => {
    expect(liffRedirectFor('?liff.state=%2Fleave&code=abc&state=xyz', '/liff')).toBe(
      '/liff/leave?code=abc&state=xyz',
    );
  });

  it('liff.state 自己帶的 query 也留著（兩邊同名時以它為準）', () => {
    expect(liffRedirectFor('?liff.state=%2Fleave%3Fday%3Dtoday&code=abc', '/liff')).toBe(
      '/liff/leave?day=today&code=abc',
    );
  });

  it('站外轉址一律不轉', () => {
    expect(liffRedirectFor('?liff.state=https%3A%2F%2Fevil.example', '/liff')).toBeNull();
  });
});
