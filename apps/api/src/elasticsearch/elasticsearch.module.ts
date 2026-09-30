import { Global, Module } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

export const ELASTIC_CLIENT = 'ELASTIC_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: ELASTIC_CLIENT,
      useFactory: () =>
        new Client({
          node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
          auth: {
            username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD ?? 'admin',
          },
        }),
    },
  ],
  exports: [ELASTIC_CLIENT],
})
export class ElasticsearchModule {}
