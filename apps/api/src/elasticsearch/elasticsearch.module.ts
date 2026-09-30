import { Global, Module } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { config } from '../config.js';

export const ELASTIC_CLIENT = 'ELASTIC_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: ELASTIC_CLIENT,
      useFactory: () =>
        new Client({
          node: config.elasticsearch.node,
          auth: { username: config.elasticsearch.username, password: config.elasticsearch.password },
        }),
    },
  ],
  exports: [ELASTIC_CLIENT],
})
export class ElasticsearchModule {}
