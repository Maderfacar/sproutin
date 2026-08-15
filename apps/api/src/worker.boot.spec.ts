import { Test } from '@nestjs/testing';
import { WorkerModule } from './events/worker.module';
import { PrismaService } from './core/prisma/prisma.service';
import { OutboxDispatcherService } from './events/outbox-dispatcher.service';
import { EventHandlersService } from './events/event-handlers.service';

// Worker DI bootstrap smoke test（比照 app.module.spec）：編譯 WorkerModule 整個 DI 圖，
// 攔截「CI 綠但 worker 啟動崩潰」的 wiring 錯誤（handler/dispatcher provider 缺依賴）。
// 硬性規矩：worker 改用 Nest context 必須有等價啟動驗證。以 mock PrismaService 取代真連線。
describe('WorkerModule (DI bootstrap)', () => {
  it('WorkerModule 可解析;dispatcher + handler 可取得', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [WorkerModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    expect(moduleRef.get(OutboxDispatcherService)).toBeInstanceOf(OutboxDispatcherService);
    expect(moduleRef.get(EventHandlersService)).toBeInstanceOf(EventHandlersService);
    await moduleRef.close();
  });
});
