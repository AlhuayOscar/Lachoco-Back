import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UsePipes,
  Put,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';

import { updateFlavorDto } from './dto/update-product.dto';
import { ApiTags } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { validatePresentation } from 'src/pipes/validatePresentation.pipe';
import { PaginationQuery } from 'src/dto/pagination.dto';

@Controller('products')
@ApiTags('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UsePipes(validatePresentation)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(@Query() pagination?: PaginationQuery) {
    return this.productService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put('/addFlavor/:id')
  updateFlavor(
    @Param('id') id: string,
    @Body() updateFlavorDto: updateFlavorDto,
  ) {
    return this.productService.updateFlavor(id, updateFlavorDto);
  }

  @Put('/removeFlavor/:id')
  removeFlavor(
    @Param('id') id: string,
    @Body() updateFlavorDto: updateFlavorDto,
  ) {
    return this.productService.removeFlavor(id, updateFlavorDto);
  }

  @Put(':id')
  inactiveProduct(@Param('id') id: string) {
    return this.productService.inactiveProduct(id);
  }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
