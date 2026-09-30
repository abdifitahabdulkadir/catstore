import { Global, Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service.js';

@Global()
@Module({
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
