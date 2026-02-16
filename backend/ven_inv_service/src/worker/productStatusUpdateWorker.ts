import { getRabbitChannel } from '../config/rabbitmq';
import { ProductStatus } from '../entities/productEntity';
import { logger } from '../config/logger';
import { ProductRepository } from '../repositories/productRepository';

/**
 * RabbitMQ Config
 */
const EXCHANGE = 'domain_events';
const QUEUE = 'inventory.product.status.queue';
const ROUTING_KEY = 'inventory.product.status.update';

/**
 * Allowed bill types
 */
type BillType = 'SALE' | 'RENT' | 'LEASE';

/**
 * BillType → ProductStatus mapping
 */
const STATUS_MAP: Record<BillType, ProductStatus> = {
  SALE: ProductStatus.SOLD,
  RENT: ProductStatus.RENTED,
  LEASE: ProductStatus.LEASE,
};

/**
 * Runtime type guard for billType
 */
function isBillType(value: unknown): value is BillType {
  return value === 'SALE' || value === 'RENT' || value === 'LEASE';
}

/**
 * Consumer bootstrap
 */
export async function startProductStatusConsumer() {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      const { productId, billType, invoiceId, approvedBy, approvedAt } = event;

      logger.info('[INVENTORY] Product status event received', {
        productId,
        billType,
        invoiceId,
        approvedBy,
        approvedAt,
      });

      /**
       * 1️⃣ Payload validation
       */
      if (!productId || !billType) {
        logger.error('Invalid product status event payload', event);
        channel.ack(msg);
        return;
      }

      if (!isBillType(billType)) {
        logger.error('Unsupported billType received', { billType });
        channel.ack(msg);
        return;
      }

      const newStatus = STATUS_MAP[billType];
      const productRepo = new ProductRepository();

      /**
       * 2️⃣ Fetch product
       */
      const product = await productRepo.findOne(productId);

      if (!product) {
        logger.error('Product not found', { productId });
        channel.ack(msg); // ACK to prevent infinite retries
        return;
      }

      /**
       * 3️⃣ Idempotency check
       */
      if (product.product_status === newStatus) {
        logger.info('Product already in correct state', {
          productId,
          status: newStatus,
        });
        channel.ack(msg);
        return;
      }

      /**
       * 4️⃣ Update product status
       */
      product.product_status = newStatus;
      await productRepo.addProduct(product);

      logger.info('Product status updated successfully', {
        productId,
        status: newStatus,
      });

      /**
       * 5️⃣ ACK only after DB success
       */
      channel.ack(msg);
    } catch (error) {
      logger.error('Product status consumer failed', error);
      // ❌ NO ACK → RabbitMQ retries automatically
    }
  });

  logger.info('Product status consumer started and listening');
}
