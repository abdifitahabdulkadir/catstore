import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PAGE_SIZE, ProductsService } from './products.service.js';

const MAX_SEARCH_LENGTH = 100;

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) { }

  // GET /products?page=1&q=wireless&category=electronics — 25 products per page.
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('q') q?: string,
    @Query('category') category?: string,
  ) {
    return this.products.findPage(Math.max(1, page), q?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined, category || undefined);
  }

  // Same page as GET /products, streamed as NDJSON: a `meta` line as soon as the count is
  // known, then one `product` line per result, flushed individually as it is written.
  @Get('stream')
  async stream(
    @Res() res: Response,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) rawPage: number,
    @Query('q') rawQ?: string,
    @Query('category') rawCategory?: string,
  ) {
    const page = Math.max(1, rawPage);
    const q = rawQ?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
    const category = rawCategory || undefined;

    const hits = this.products.findHits(page, q, category);
    hits.catch(() => undefined); // surfaced below; avoids an unhandled rejection while awaiting count
    const send = (obj: object) => res.write(JSON.stringify(obj) + '\n');

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const total = await this.products.count(q, category);
      send({ type: 'meta', page, pageSize: PAGE_SIZE, total, totalPages: this.products.totalPages(total, q) });
      for (const product of await hits) {
        send({ type: 'product', product });
      }
    } catch (err) {
      send({ type: 'error', message: err instanceof Error ? err.message : 'Search failed' });
    }
    res.end();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
