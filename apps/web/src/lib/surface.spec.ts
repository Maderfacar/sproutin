import { describe, expect, it } from 'vitest';
import { surfaceOf, toSurfaceHref } from './surface';

describe('surfaceOf', () => {
  it('/admin 之下是桌面外框，其餘是手機外框', () => {
    expect(surfaceOf('/admin')).toBe('admin');
    expect(surfaceOf('/admin/students/abc')).toBe('admin');
    expect(surfaceOf('/liff/student/abc')).toBe('mobile');
    expect(surfaceOf('/')).toBe('mobile');
  });
});

describe('toSurfaceHref', () => {
  it('在手機外框完全不改網址', () => {
    expect(toSurfaceHref('/liff/admin/students', 'mobile')).toBe('/liff/admin/students');
    expect(toSurfaceHref('/liff/student/s1', 'mobile')).toBe('/liff/student/s1');
  });

  it('在桌面外框把已搬過去的功能翻成桌面網址（含動態路由）', () => {
    expect(toSurfaceHref('/liff/admin/students', 'admin')).toBe('/admin/students');
    expect(toSurfaceHref('/liff/admin/classes', 'admin')).toBe('/admin/classes');
    expect(toSurfaceHref('/liff/student/s1', 'admin')).toBe('/admin/students/s1');
  });

  // 網址上原本就帶著的 query 不能弄丟（例如從娃娃車設定頁帶篩選條件過去）。
  it('翻譯時保留 query 與 hash', () => {
    expect(toSurfaceHref('/liff/admin/students?classId=c1', 'admin')).toBe(
      '/admin/students?classId=c1',
    );
    expect(toSurfaceHref('/liff/student/s1#bus', 'admin')).toBe('/admin/students/s1#bus');
  });

  // 少了 from=admin，返回鍵會把人丟到手機版首頁而不是後台（見 lib/backTarget）。
  it('還沒搬到桌面的功能留在手機版，但自動補上 from=admin', () => {
    expect(toSurfaceHref('/liff/audit', 'admin')).toBe('/liff/audit?from=admin');
    expect(toSurfaceHref('/liff/leave?studentId=s1', 'admin')).toBe(
      '/liff/leave?studentId=s1&from=admin',
    );
    expect(toSurfaceHref('/liff/audit?from=admin', 'admin')).toBe('/liff/audit?from=admin');
  });

  it('外部與非 /liff 網址原樣放行', () => {
    expect(toSurfaceHref('/admin/people', 'admin')).toBe('/admin/people');
    expect(toSurfaceHref('https://example.com', 'admin')).toBe('https://example.com');
  });

  // 前綴必須停在路徑邊界：/liff/students-import 這種名字不該被 /liff/student 吃掉。
  it('前綴比對停在路徑邊界', () => {
    expect(toSurfaceHref('/liff/students-import', 'admin')).toBe(
      '/liff/students-import?from=admin',
    );
  });
});
