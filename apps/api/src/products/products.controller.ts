import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { parseListQuery } from './products.query.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) { }

  // GET /products?page=1&limit=25&q=wireless&category=electronics (all optional)
  @Get()
  findAll(@Query() query: Record<string, unknown>) {
    const { page, limit, q, category } = parseListQuery(query);
    return this.products.findPage(page, limit, q, category);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
