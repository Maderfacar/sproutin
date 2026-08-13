import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Render / 多數 PaaS 以 PORT 注入指定埠；本機 fallback API_PORT / 3001。
  const port = process.env.PORT
    ? Number(process.env.PORT)
    : process.env.API_PORT
      ? Number(process.env.API_PORT)
      : 3001;
  // 綁 0.0.0.0 讓容器平台可對外路由。
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[api] Sproutin API listening on 0.0.0.0:${port}`);
}

void bootstrap();
