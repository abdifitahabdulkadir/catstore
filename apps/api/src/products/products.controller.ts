import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { config } from '../config.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) { }

  // GET /products?page=1&q=wireless&category=electronics
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(config.defaultPage), ParseIntPipe) page: number,
    @Query('q') q?: string,
    @Query('category') category?: string,
  ) {
    return this.products.findPage(
      Math.max(config.defaultPage, page),
      q?.trim().slice(0, config.maxSearchLength) || undefined,
      category || undefined,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
