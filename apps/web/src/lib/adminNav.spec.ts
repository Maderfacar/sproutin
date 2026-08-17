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
    expect(hrefs(teacher)).not.toContain('/liff/audit');
    expect(hrefs(owner)).toContain('/liff/audit');
  });

  it('尚未搬到桌面版的項目一律標示為手機版，不做成點不下去的死角', () => {
    for (const section of adminNav(owner)) {
      for (const item of section.items) {
        if (item.href.startsWith('/admin')) {
          expect(item.onlyMobile).toBeUndefined();
        } else {
          expect(item.href.startsWith('/liff')).toBe(true);
          expect(item.onlyMobile).toBe(true);
        }
      }
    }
  });

  // 班級與學生已經搬到桌面版（同一份元件手機版也有）→ 導覽必須指向 /admin/*，
  // 否則園長在後台按下去會被丟進手機版版型，娃娃車的「指派接送點」那一段也就走不完。
  it('班級與學生指向桌面版，不再標手機版', () => {
    const items = adminNav(owner).flatMap((s) => s.items);
    for (const href of ['/admin/classes', '/admin/students']) {
      const item = items.find((i) => i.href === href);
      expect(item, href).toBeDefined();
      expect(item?.onlyMobile).toBeUndefined();
    }
    expect(hrefs(owner)).not.toContain('/liff/admin/classes');
    expect(hrefs(owner)).not.toContain('/liff/admin/students');
  });

  // 娃娃車設定在桌面版有真的頁面（同一份元件手機版也有），所以不標 onlyMobile。
  it('園長看得到娃娃車設定；老師看不到', () => {
    expect(hrefs(owner)).toContain('/admin/bus');
    expect(hrefs(teacher)).not.toContain('/admin/bus');
  });

  it('點名入口只給看得到娃娃車點名的人', () => {
    const busTeacher = roleFlags([{ role: 'BUS_TEACHER', scopeType: 'SCHOOL', scopeId: null }]);
    expect(hrefs(busTeacher)).toContain('/liff/bus');
    expect(hrefs(teacher)).not.toContain('/liff/bus');
  });

  it('沒有重複的連結', () => {
    const all = hrefs(owner);
    expect(new Set(all).size).toBe(all.length);
  });
});
