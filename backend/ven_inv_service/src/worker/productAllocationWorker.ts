import { createRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { Source } from '../config/db';
import { Product, ProductStatus } from '../entities/productEntity';
import { ModelRepository } from '../repositories/modelRepository';
import { ModelService } from '../services/modelService';
import { ProcessedInvoiceItem } from '../entities/processedInvoiceItemEntity';

const EXCHANGE = 'domain_events';
const QUEUE = 'inventory.product.allocate.queue';
const ROUTING_KEY = 'inventory.product.allocate';

export async function startProductAllocationConsumer() {
  const channel = await createRabbitChannel();

  const DLX = 'dlx.inventory';
  const DLQ = 'dlq.inventory';

  await channel.assertExchange(DLX, 'topic', { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, '#');

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX,
      'x-dead-letter-routing-key': 'inventory.product.allocate.dlq',
    },
  });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const { serialNumber, invoiceId, invoiceItemId } = event;

      logger.info('[INVENTORY] Product allocate event received', {
        serialNumber,
        invoiceId,
        invoiceItemId,
      });

      if (!serialNumber) {
        logger.error('Invalid product allocate event payload', event);
        channel.ack(msg);
        return;
      }

      if (invoiceItemId) {
        const queryRunner = Source.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const alreadyProcessed = await queryRunner.manager.findOne(ProcessedInvoiceItem, {
            where: { invoiceItemId },
          });

          if (alreadyProcessed) {
            logger.info('[INVENTORY] Event already processed for invoiceItemId, skipping.', {
              invoiceItemId,
            });
            await queryRunner.rollbackTransaction();
            channel.ack(msg);
            return;
          }

          const product = await queryRunner.manager.findOne(Product, {
            where: { serial_no: serialNumber },
          });

          if (!product) {
            logger.error('Product not found by serialNumber', { serialNumber });
            await queryRunner.rollbackTransaction();
            channel.ack(msg);
            return;
          }

          if (product.product_status === ProductStatus.SOLD) {
            logger.info('Product already SOLD', { serialNumber });
            await queryRunner.manager.save(ProcessedInvoiceItem, { invoiceItemId });
            await queryRunner.commitTransaction();
            channel.ack(msg);
            return;
          }

          product.product_status = ProductStatus.SOLD;
          await queryRunner.manager.save(product);
          await queryRunner.manager.save(ProcessedInvoiceItem, { invoiceItemId });

          await queryRunner.commitTransaction();

          logger.info('Product status updated to SOLD for allocation (Idempotent)', {
            serialNumber,
            invoiceId,
            invoiceItemId,
          });

          if (product.model_id) {
            const modelRepo = new ModelRepository();
            const modelService = new ModelService();
            await modelRepo.syncModelQuantities(product.model_id);
            await modelService.syncToRedis(product.model_id);
          }
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } else {
        const productRepo = Source.getRepository(Product);
        const product = await productRepo.findOne({ where: { serial_no: serialNumber } });

        if (!product) {
          logger.error('Product not found by serialNumber', { serialNumber });
          channel.ack(msg);
          return;
        }

        if (product.product_status === ProductStatus.SOLD) {
          logger.info('Product already SOLD', { serialNumber });
          channel.ack(msg);
          return;
        }

        product.product_status = ProductStatus.SOLD;
        await productRepo.save(product);

        logger.info('Product status updated to SOLD for allocation (Legacy)', {
          serialNumber,
          invoiceId,
        });

        if (product.model_id) {
          const modelRepo = new ModelRepository();
          const modelService = new ModelService();
          await modelRepo.syncModelQuantities(product.model_id);
          await modelService.syncToRedis(product.model_id);
        }
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('Product allocation consumer failed', error);
      channel.nack(msg, false, false);
    }
  });

  logger.info('Product allocation consumer started and listening');
}
