import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, status } from 'src/order/entities/order.entity';
import { Stripe } from 'stripe';
import { Repository } from 'typeorm';
import {
  MercadoPagoConfig,
  MerchantOrder,
  Payment,
  Preference,
} from 'mercadopago';
import { EmailService } from 'src/email/email.service';
import { bodyPagoMP } from 'src/user/emailBody/bodyPagoMP';
import { checkoutOrder } from './dto/checkout.dto';
import { GiftCard } from 'src/gitfcards/entities/gitfcard.entity';
import { Product } from 'src/product/entities/product.entity';
import { OrderDetail } from 'src/order/entities/orderDetail.entity';

const stripe = new Stripe(process.env.KEY_STRIPE);
const client = new MercadoPagoConfig({ accessToken: process.env.KEY_MP });
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(Order)
    private orderDetailRepository: Repository<OrderDetail>,
    @InjectRepository(GiftCard)
    private giftCardRepository: Repository<GiftCard>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private emailService: EmailService,
  ) {}

  async checkoutSession(order: checkoutOrder) {
    let totalProducts;
    let updateOrder;
    let orderById = await this.orderRepository.findOne({
      where: { id: order.orderId },
      relations: {
        orderDetail: {
          orderDetailProducts: {
            product: { category: true },
            orderDetailFlavors: true,
          },
        },
        user: { giftcards: true },
        giftCard: true,
      },
    });

    if (!orderById) throw new NotFoundException('Order not found');
    if (orderById.orderDetail.orderDetailProducts.length === 0)
      throw new BadRequestException('Order without products');
    let discount = 0;

    //*buscar si usuario tiene giftcard
    const findGitCard = await this.giftCardRepository.findOne({
      where: { id: order.giftCardId },
      relations: { product: true },
    });

    if (findGitCard.isUsed === true)
      throw new BadRequestException('GiftCard is Used');

    const hasGiftCardCode = orderById.user.giftcards.find(
      (g) => g.code === findGitCard.code,
    );
    if (hasGiftCardCode) {
      //*si giftcardId no undefined, buscar producto
      if (findGitCard.product !== null) {
        //*agregar giftcard a orden
        await this.orderRepository.update(
          { id: orderById.id },
          { giftCard: findGitCard },
        );
        updateOrder = await this.orderRepository.findOne({
          where: { id: orderById.id },
          relations: {
            orderDetail: {
              orderDetailProducts: {
                product: { category: true },
                orderDetailFlavors: true,
              },
            },
            user: { giftcards: true },
            giftCard: true,
          },
        });
        orderById = updateOrder;
      }
      discount = hasGiftCardCode.discount;
    }

    if (order.country === 'COL') {
      const preference = new Preference(client);

      totalProducts = orderById.orderDetail.orderDetailProducts.map((p) => ({
        id: p.id,
        title: p.product.category.name,
        quantity: p.cantidad,
        unit_price: Number(p.product.price),
      }));
      const totalPriceProducts = totalProducts.reduce(
        (accumulator, currentProduct) => {
          return accumulator + Number(currentProduct.unit_price);
        },
        0,
      );

      try {
        const res = await preference.create({
          body: {
            payer: {
              name: orderById.user.name,
              surname: orderById.user.lastname,
              email: orderById.user.email,
            },
            statement_descriptor: 'Chocolatera',
            metadata: { order: orderById },
            back_urls: {
              success: 'http://localhost:3000/pagos/success',
              failure: 'http://localhost:3000/pagos/failure',
              pending: 'http://localhost/3000/pagos/pending',
            },
            items: [
              {
                id: orderById.id,
                title: 'Productos',
                quantity: 1,
                unit_price: totalPriceProducts - discount,
              },
            ],
            notification_url:
              'https://3e58-190-246-136-74.ngrok-free.app/pagos/webhook',
          },
        });
        return res.init_point;
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
    if (order.country === 'SPAIN' || order.country === 'GLOBAL') {
      let customer = orderById.user.customerId;
      if (!orderById.user.customerId) {
        customer = await stripe.customers
          .create({
            email: orderById.user.email,
          })
          .then((customer) => customer.id);
      }
      totalProducts = orderById.orderDetail.orderDetailProducts.map((p) => ({
        price_data: {
          product_data: {
            name: p.product.category.name,
            description: p.product.description,
          },
          currency: `${order.country === 'SPAIN' ? 'EUR' : 'USD'}`,
          unit_amount: Number(p.product.price) * p.cantidad,
        },
        quantity: p.cantidad,
      }));

      const totalPriceProducts = totalProducts.reduce(
        (accumulator, currentProduct) => {
          return (
            Number(accumulator) + Number(currentProduct.price_data.unit_amount)
          );
        },
        0,
      );

      const session = await stripe.checkout.sessions.create({
        customer: customer,
        line_items: [
          {
            price_data: {
              product_data: {
                name: 'Productos',
                description: 'Productos',
              },
              currency: 'EUR',
              unit_amount: Number(totalPriceProducts * 100 - discount * 100),
            },
            quantity: 1,
          },
        ],
        invoice_creation: { enabled: true },
        metadata: {
          order: orderById.id,
          user: orderById.user.id,
        },
        mode: 'payment',
        payment_method_types: ['card'],
        success_url: 'http://localhost:3000/pagos/success',
        cancel_url: 'http://localhost:3000/pagos/cancel',
      });

      return { url: session.url };
    }
  }

  async success() {
    return 'success';
  }

  async cancel() {
    return 'cancel';
  }

  //*mp webhook
  async receiveWebhook(query: any) {
    const payment = query;
    const searchPayment = new Payment(client);
    const searchMercharOrder = new MerchantOrder(client);
    try {
      if (payment.type === 'payment') {
        const data = await searchPayment.get({ id: payment['data.id'] });
        const mercharOrderBody = await searchMercharOrder.get({
          merchantOrderId: data.order.id,
        });

        const payments = mercharOrderBody.payments;
        console.log('*******', payments, '****');

        const orderById = await this.orderRepository.findOne({
          where: { id: data.metadata.order.id },
          relations: {
            orderDetail: {
              orderDetailProducts: {
                product: { category: true },
                orderDetailFlavors: true,
              },
            },
            user: true,
            giftCard: { product: true },
          },
        });
        if (orderById.status === status.FINISHED)
          throw new BadRequestException('Order Finished');
        if (!orderById) throw new NotFoundException('Order not found');
        if (orderById.orderDetail.orderDetailProducts.length === 0)
          throw new BadRequestException('Order without products');

        //*Encaso de que tenga cupo actualizar a usado
        if (orderById.giftCard !== null) {
          await this.giftCardRepository.update(
            { id: orderById.giftCard.id },
            { isUsed: true },
          );
        }

        await this.orderRepository.update(
          {
            id: orderById.id,
          },
          { status: status.FINISHED },
        );

        const template = bodyPagoMP(
          orderById.user.email, //*email
          'Compra Exitosa',
          orderById.user, //*user
          payments,
          orderById, //*order
        );

        const mail = {
          to: orderById.user.email,
          subject: 'Compra Exitosa',
          text: 'Compra Exitosa',
          template: template,
        };
        await this.emailService.sendPostulation(mail);
      }
    } catch (error) {
      console.log(error);
    }
  }

  //*stripeWebhook
  async stripeWebhook(req: any) {
    console.log('**********', req.body, '***********');

    // const invoice = stripe.invoices.create({
    //   customer: 'cus_NeZwdNtLEOXuvB',
    // });
  }
}
