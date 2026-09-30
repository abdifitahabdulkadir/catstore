import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';

@Module({
  imports: [
    // Global rate limit: 50 requests per second per client IP.
    ThrottlerModule.forRoot([{ ttl: 1000, limit: 50 }]),
    ElasticsearchModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
