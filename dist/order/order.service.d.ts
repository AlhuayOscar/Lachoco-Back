import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { PaginationQuery } from 'src/dto/pagination.dto';
import { OrderDetail } from './entities/orderDetail.entity';
import { User } from 'src/user/entities/user.entity';
import { Product } from 'src/product/entities/product.entity';
import { OrderDetailProduct } from './entities/orderDetailsProdusct.entity';
export declare class OrderService {
    private orderRepository;
    private orderDetailRepository;
    private userRepository;
    private productRepository;
    private OrderDetailProductRepository;
    constructor(orderRepository: Repository<Order>, orderDetailRepository: Repository<OrderDetail>, userRepository: Repository<User>, productRepository: Repository<Product>, OrderDetailProductRepository: Repository<OrderDetailProduct>);
    create(createOrderDto: CreateOrderDto): Promise<Order[]>;
    findAll(pagination: PaginationQuery): Promise<any>;
    findOne(id: string): Promise<Order>;
    update(id: number, updateOrderDto: UpdateOrderDto): string;
    remove(id: number): string;
}
