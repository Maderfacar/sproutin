import { describe, it, expect } from 'vitest';
import { documentTitleFor, pageTitleFor } from './pageTitle';

describe('pageTitleFor', () => {
  it('手機版網址查得到頁名', () => {
    expect(pageTitleFor('/liff/leave')).toBe('請假');
  });

  it('桌面版網址翻回手機版再查（一個功能只寫一次）', () => {
    expect(pageTitleFor('/admin/leave')).toBe('請假');
    expect(pageTitleFor('/admin/communication-book')).toBe('聯絡簿');
  });

  // 純 startsWith 會讓 /admin/bus-roster（點名）被 /admin/bus（設定）誤中。
  it('娃娃車的設定與點名是兩頁，不會互相蓋掉', () => {
    expect(pageTitleFor('/admin/bus')).toBe('娃娃車設定');
    expect(pageTitleFor('/admin/bus-roster')).toBe('娃娃車點名');
    expect(pageTitleFor('/liff/bus')).toBe('娃娃車點名');
  });

  // 長的前綴要先比，否則 /liff/admin/roles 會被 /liff（首頁）吃掉。
  it('長前綴優先於短前綴', () => {
    expect(pageTitleFor('/liff/admin/roles')).toBe('權限設定');
    expect(pageTitleFor('/admin/login')).toBe('登入');
    expect(pageTitleFor('/admin')).toBe('總覽');
    expect(pageTitleFor('/liff')).toBe('首頁');
  });

  it('動態路由涵蓋得到', () => {
    expect(pageTitleFor('/liff/student/abc123')).toBe('學生');
    expect(pageTitleFor('/admin/communication-book/abc123')).toBe('聯絡簿');
  });

  it('認不出來的網址回 null（不硬掰頁名）', () => {
    expect(pageTitleFor('/nope')).toBeNull();
  });
});

describe('documentTitleFor', () => {
  it('頁名 · 園名', () => {
    expect(documentTitleFor('/liff/leave', '綠芽幼兒園')).toBe('請假 · 綠芽幼兒園');
  });

  it('認不出來的網址只顯示園名', () => {
    expect(documentTitleFor('/nope', '綠芽幼兒園')).toBe('綠芽幼兒園');
  });
});
