import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Address } from 'src/user/entities/address.entity';
import { Order } from 'src/order/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address, Order])],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
