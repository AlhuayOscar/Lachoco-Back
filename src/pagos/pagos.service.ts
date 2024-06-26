import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/order/entities/order.entity';
import { Stripe } from 'stripe';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

const stripe = new Stripe(process.env.KEY_STRIPE);
const client = new MercadoPagoConfig({ accessToken: process.env.KEY_MP });
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
  ) {}

  async checkoutSession(order: any) {
    console.log(order);
    const orderById = await this.orderRepository.findOne({
      where: { id: order.order },
      relations: {
        orderDetail: {
          orderDetailProducts: {
            product: { category: true },
            orderDetailFlavors: true,
          },
        },
      },
    });

    if (!orderById) throw new NotFoundException('Order not found');
    if (orderById.orderDetail.orderDetailProducts.length === 0)
      throw new BadRequestException('Order without products');

    if (order.country === 'COL') {
      const preference = new Preference(client);
      try {
        const res = await preference.create({
          body: {
            back_urls: {
              success: 'http://localhost:3000/pagos/success',
              failure: 'http://localhost:3000/pagos/failure',
              pending: 'http://localhost/3000/pagos/pending',
            },
            items: orderById.orderDetail.orderDetailProducts.map((p) => ({
              id: p.id,
              title: p.product.category.name,
              quantity: p.cantidad,
              unit_price: Number(p.product.price),
            })),
            notification_url:
              'https://9e54-190-246-136-74.ngrok-free.app/pagos/webhook',
          },
        });
        return res.init_point;
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
    if (order.country === 'SPAIN') {
      const session = await stripe.checkout.sessions.create({
        line_items: orderById.orderDetail.orderDetailProducts.map((p) => ({
          price_data: {
            product_data: {
              name: p.product.category.name,
              description: p.product.description,
            },
            currency: 'EUR',
            unit_amount: p.product.price * 100,
          },
          quantity: p.cantidad,
        })),
        mode: 'payment',
        success_url: 'http://localhost:3000/pagos/success',
        cancel_url: 'http://localhost:3000/pagos/cancel',
      });

      return session;
    }
  }

  async success() {
    return 'success';
  }

  async cancel() {
    return 'cancel';
  }

  async receiveWebhook(query: any) {
    const payment = query;
    const searchPayment = new Payment(client);
    console.log(query);
    try {
      if (payment.type === 'payment') {
        const data = await searchPayment.get({ id: payment['data.id'] });
        console.log(data);
      }
    } catch (error) {
      console.log(error);
    }
  }
}