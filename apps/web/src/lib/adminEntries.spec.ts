import { describe, expect, it } from 'vitest';
import { adminEntries } from './adminEntries';
import { roleFlags } from './roles';

const owner = roleFlags([{ role: 'OWNER', scopeType: 'SCHOOL', scopeId: null }]);
const teacher = roleFlags([{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-1' }]);

describe('adminEntries', () => {
  it('連到手機版版型的頁面一律帶 from=admin（否則返回鍵會把人丟到手機版首頁）', () => {
    for (const entry of adminEntries(owner)) {
      if (entry.href.startsWith('/liff')) {
        expect(entry.href).toContain('?from=admin');
      }
    }
  });

  it('後台自己的頁面不需要帶參數', () => {
    for (const entry of adminEntries(owner)) {
      if (entry.href.startsWith('/admin')) {
        expect(entry.href).not.toContain('from=admin');
      }
    }
  });

  it('老師看不到園務管理入口', () => {
    const hrefs = adminEntries(teacher).map((e) => e.href);
    expect(hrefs).not.toContain('/admin/people');
    expect(hrefs).not.toContain('/admin/roles');
  });

  it('每個人都至少有得點', () => {
    expect(adminEntries(teacher).length).toBeGreaterThan(0);
  });
});
