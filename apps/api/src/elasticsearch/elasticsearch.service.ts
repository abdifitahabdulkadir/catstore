import { Client } from '@elastic/elasticsearch';
import { Injectable } from '@nestjs/common';
import { config } from '../config.js';


@Injectable()
export class ElasticsearchService extends Client {
  constructor() {
    super({
      node: config.elasticsearch.node,
      auth: { username: config.elasticsearch.username, password: config.elasticsearch.password },
    });
  }
}
