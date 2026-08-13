import { HealthController } from './health.controller';

// Test baseline：最小單元測試，驗證 skeleton 可測。
describe('HealthController', () => {
  it('returns ok status', () => {
    const controller = new HealthController();
    expect(controller.check().status).toBe('ok');
  });
});
