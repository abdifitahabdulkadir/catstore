import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { config } from './config.js';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';

@Module({
  imports: [
    // Global rate limit per client IP (RATE_LIMIT requests per RATE_LIMIT_TTL_MS).
    ThrottlerModule.forRoot([config.rateLimit]),
    ElasticsearchModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
