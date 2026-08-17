import { describe, expect, it } from 'vitest';
import { ADMIN_HOME, MOBILE_HOME, resolveBackHref } from './backTarget';

// 從桌面後台點進手機版功能後，返回鍵必須回後台，否則等於中途被換到另一個 App。
describe('resolveBackHref', () => {
  it('網址帶 from=admin → 回後台', () => {
    expect(resolveBackHref('admin', null)).toBe(ADMIN_HOME);
  });

  it('後續子頁沒帶參數，但這個分頁記得是從後台進來的 → 仍回後台', () => {
    expect(resolveBackHref(null, ADMIN_HOME)).toBe(ADMIN_HOME);
  });

  it('純手機版使用者 → 維持原本回手機版首頁（已驗收的行為不動）', () => {
    expect(resolveBackHref(null, null)).toBe(MOBILE_HOME);
  });

  it('無法辨識的來源不會被當成後台', () => {
    expect(resolveBackHref('somewhere-else', null)).toBe(MOBILE_HOME);
    expect(resolveBackHref(null, '/evil')).toBe(MOBILE_HOME);
  });
});
