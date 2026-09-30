import { NestFactory } from '@nestjs/core';
import { config } from './config.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: config.webOrigin } });
  await app.listen(config.port);
}
await bootstrap();
