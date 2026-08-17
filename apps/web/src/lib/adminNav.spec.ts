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
