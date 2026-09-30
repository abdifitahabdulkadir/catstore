import { Client } from '@elastic/elasticsearch';
import { Injectable } from '@nestjs/common';
import { config } from '../config.js';

// The Elasticsearch client as an injectable class, so consumers inject it by type.
@Injectable()
export class ElasticsearchService extends Client {
  constructor() {
    super({
      node: config.elasticsearch.node,
      auth: { username: config.elasticsearch.username, password: config.elasticsearch.password },
    });
  }
}
