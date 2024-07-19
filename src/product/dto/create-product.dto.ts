import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { label, currency } from 'src/product/entities/product.entity';
export class CreateProductDto {
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  price: number;

  @IsEnum(currency)
  currency: currency;

  // @IsNumber()
  // stock: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  presentacion: number;

  @IsArray()
  images: string[];

  @IsArray()
  flavors: { id: string; name: string; stock: number }[];
}
