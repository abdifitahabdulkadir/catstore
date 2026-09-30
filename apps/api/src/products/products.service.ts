import { BadRequestException, Injectable } from '@nestjs/common';
import { config } from '../config.js';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service.js';

const INDEX = config.elasticsearch.index;
// Text searches are ranked by relevance, so pages past the result window are cut off.
const maxSearchPages = (limit: number) => Math.floor(config.maxResultWindow / limit);

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  image: string | null;
};

export type ProductHit = Product & { score?: number };

export type ProductPage = {
  items: ProductHit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly es: ElasticsearchService) { }

  private query(q?: string, category?: string) {
    const filter: object[] = category ? [{ term: { category } }] : [];
    const must: object[] = q
      ? [{ multi_match: { query: q, fields: ['name^3', 'description'] } }]
      : [];
    return { bool: { must, filter } };
  }

  private async count(q?: string, category?: string): Promise<number> {
    const { count } = await this.es.count({ index: INDEX, query: this.query(q, category) });
    return count;
  }

  // Pages are fetched in O(1) wherever possible, because Elasticsearch caps from/size
  // paging at 10,000 results:
  //  - no filters:      range on the contiguous `id`
  //  - category only:   range on `categoryRank` (position within the category)
  //  - text search:     relevance from/size, limited to the result window
  private async findHits(page: number, limit: number, q?: string, category?: string): Promise<ProductHit[]> {
    const query = this.query(q, category);
    const start = (page - 1) * limit;
    let from = 0;
    let sortField: string | null = null;

    if (q) {
      const maxPages = maxSearchPages(limit);
      if (page > maxPages) {
        throw new BadRequestException(`Search results only go up to page ${maxPages}; refine your query.`);
      }
      from = start;
    } else {
      sortField = category ? 'categoryRank' : 'id';
      query.bool.filter.push({ range: { [sortField]: { gt: start, lte: start + limit } } });
    }

    const res = await this.es.search<Product>({
      index: INDEX,
      from,
      size: limit,
      track_total_hits: false,
      _source: { excludes: ['categoryRank'] },
      query,
      sort: sortField ? [{ [sortField]: 'asc' }] : ['_score', { id: 'asc' }],
    });
    // Relevance is only meaningful for text searches; other pages are sorted by a field.
    return res.hits.hits.map((h) => (q ? { ...(h._source as Product), score: h._score ?? undefined } : (h._source as Product)));
  }

  private totalPages(total: number, limit: number, q?: string): number {
    const pages = Math.ceil(total / limit);
    return q ? Math.min(pages, maxSearchPages(limit)) : pages;
  }

  async findPage(page: number, limit: number, q?: string, category?: string): Promise<ProductPage> {
    const [total, items] = await Promise.all([
      this.count(q, category),
      this.findHits(page, limit, q, category),
    ]);
    return { items, page, pageSize: limit, total, totalPages: this.totalPages(total, limit, q) };
  }

  async findOne(id: number): Promise<Product | null> {
    const res = await this.es.get<Product>({ index: INDEX, id: String(id), _source_excludes: ['categoryRank'] }, { ignore: [404] });
    return res.found ? (res._source as Product) : null;
  }
}
