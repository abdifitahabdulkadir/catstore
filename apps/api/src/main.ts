import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:301" } });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
