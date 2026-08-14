import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './core/prisma/prisma.service';

// Bootstrap smoke test：編譯整個 DI 圖以攔截「CI 綠但部署啟動崩潰」的 wiring 錯誤
// （例：guard 在 consumer 模組缺 JwtService）。以 mock PrismaService 取代真連線，不需 DB。
describe('AppModule (DI bootstrap)', () => {
  it('整個模組圖可解析（guards/providers wiring 正確）', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
