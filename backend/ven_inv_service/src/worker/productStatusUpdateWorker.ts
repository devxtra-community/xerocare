import { createRabbitChannel } from '../config/rabbitmq';
import { ProductStatus, OwnershipType } from '../entities/productEntity';
import { logger } from '../config/logger';
import { ProductRepository } from '../repositories/productRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { ModelService } from '../services/modelService';

/**
 * RabbitMQ Config
 */
const EXCHANGE = 'domain_events';
const QUEUE = 'inventory.product.status.queue';
const ROUTING_KEY = 'inventory.product.status.update';

/**
 * Allowed bill types
 */
type BillType = 'SALE' | 'RENT' | 'LEASE' | 'RETURNED' | 'DAMAGED';

/**
 * BillType → ProductStatus mapping
 */
const STATUS_MAP: Record<BillType, ProductStatus> = {
  SALE: ProductStatus.SOLD,
  RENT: ProductStatus.RENTED,
  LEASE: ProductStatus.LEASE,
  RETURNED: ProductStatus.RETURNED,
  DAMAGED: ProductStatus.DAMAGED,
};

/**
 * BillType → OwnershipType mapping
 */
const OWNERSHIP_MAP: Record<Exclude<BillType, 'RETURNED' | 'DAMAGED'>, OwnershipType> = {
  SALE: OwnershipType.SALE,
  RENT: OwnershipType.RENT,
  LEASE: OwnershipType.LEASE,
};

/**
 * Runtime type guard for billType
 */
function isBillType(value: unknown): value is BillType {
  return (
    value === 'SALE' ||
    value === 'RENT' ||
    value === 'LEASE' ||
    value === 'RETURNED' ||
    value === 'DAMAGED'
  );
}

/**
 * Consumer bootstrap
 */
export async function startProductStatusConsumer() {
  const channel = await createRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      const { productId, billType, invoiceId, approvedBy, approvedAt, customerId } = event;

      logger.info('[INVENTORY] Product status event received', {
        productId,
        billType,
        invoiceId,
        approvedBy,
        approvedAt,
        customerId,
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
      const targetCustomerId =
        billType === 'RETURNED' || billType === 'DAMAGED' ? null : customerId || null;
      const targetOwnership =
        billType === 'RETURNED' || billType === 'DAMAGED'
          ? product.ownership
          : OWNERSHIP_MAP[billType];

      if (
        product.product_status === newStatus &&
        product.customer_id === targetCustomerId &&
        product.ownership === targetOwnership
      ) {
        logger.info('Product already in correct state', {
          productId,
          status: newStatus,
          customerId: targetCustomerId,
        });
        channel.ack(msg);
        return;
      }

      /**
       * 4️⃣ Update product status and metadata
       */
      product.product_status = newStatus;
      product.customer_id = targetCustomerId;
      product.ownership = targetOwnership;
      await productRepo.addProduct(product);

      logger.info('Product status updated successfully', {
        productId,
        status: newStatus,
        customerId: targetCustomerId,
        ownership: targetOwnership,
      });

      // Update the model quantity if the product was SOLD, RENTED, or LEASED
      if (product.model_id) {
        const modelRepo = new ModelRepository();
        const modelService = new ModelService();

        // Sync model quantities
        await modelRepo.syncModelQuantities(product.model_id);

        // Sync the updated quantity to Redis
        await modelService.syncToRedis(product.model_id);
        logger.info(`Synced model ${product.model_id} quantities after product status update`);
      }

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
