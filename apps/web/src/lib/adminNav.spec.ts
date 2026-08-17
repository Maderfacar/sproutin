import { describe, expect, it } from 'vitest';
import { adminNav } from './adminNav';
import { roleFlags } from './roles';

const owner = roleFlags([{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }]);
const teacher = roleFlags([{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-1' }]);

function hrefs(flags: ReturnType<typeof roleFlags>): string[] {
  return adminNav(flags).flatMap((s) => s.items.map((i) => i.href));
}

describe('adminNav', () => {
  it('園長看得到人員與綁定', () => {
    expect(hrefs(owner)).toContain('/admin/people');
  });

  it('老師看不到人員管理（後端也會擋，這裡只是不顯示會 403 的入口）', () => {
    expect(hrefs(teacher)).not.toContain('/admin/people');
  });

  // 群發會產生費用且送出後無法收回 → 只有園長／行政。後端也擋，這裡是不顯示會 403 的入口。
  it('老師看不到發送訊息', () => {
    expect(hrefs(owner)).toContain('/admin/messages');
    expect(hrefs(teacher)).not.toContain('/admin/messages');
  });

  it('老師看不到稽核紀錄', () => {
    expect(hrefs(teacher)).not.toContain('/admin/audit');
    expect(hrefs(owner)).toContain('/admin/audit');
  });

  // 功能對等補齊之後，導覽上不該再有任何一條指向手機版版型。
  // 這條會在有人加了「只有手機版」的頁面時失敗 —— 那正是 docs/04 §3b 禁止的事。
  it('導覽已經沒有手機版專屬的項目', () => {
    for (const flags of [owner, teacher]) {
      for (const href of hrefs(flags)) {
        expect(href.startsWith('/admin'), href).toBe(true);
      }
    }
  });

  it('娃娃車設定與娃娃車點名是兩條不同的路徑', () => {
    expect(hrefs(owner)).toContain('/admin/bus');
    expect(hrefs(owner)).toContain('/admin/bus-roster');
  });

  // 娃娃車設定只有園長／行政；老師看不到。
  it('園長看得到娃娃車設定；老師看不到', () => {
    expect(hrefs(owner)).toContain('/admin/bus');
    expect(hrefs(teacher)).not.toContain('/admin/bus');
  });

  it('點名入口只給看得到娃娃車點名的人', () => {
    const busTeacher = roleFlags([{ role: 'BUS_TEACHER', scopeType: 'SCHOOL', scopeId: null }]);
    expect(hrefs(busTeacher)).toContain('/admin/bus-roster');
    expect(hrefs(teacher)).not.toContain('/admin/bus-roster');
  });

  it('沒有重複的連結', () => {
    const all = hrefs(owner);
    expect(new Set(all).size).toBe(all.length);
  });
});
