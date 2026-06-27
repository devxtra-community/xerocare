import { createRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';
import { SparePartRepository } from '../repositories/sparePartRepository';
import { ProcessedInvoiceItem } from '../entities/processedInvoiceItemEntity';

const EXCHANGE = 'domain_events';
const QUEUE = 'inventory.sparepart.reduce.queue';
const ROUTING_KEY = 'inventory.sparepart.reduce';

export async function startSparePartReductionConsumer() {
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
      'x-dead-letter-routing-key': 'inventory.sparepart.reduce.dlq',
    },
  });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const { sparePartId, quantity, invoiceId, invoiceItemId } = event;

      logger.info('[INVENTORY] Spare part reduce event received', {
        sparePartId,
        quantity,
        invoiceId,
        invoiceItemId,
      });

      if (!sparePartId || !quantity) {
        logger.error('Invalid spare part reduce event payload', event);
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

          const part = await queryRunner.manager.findOne(SparePart, {
            where: { id: sparePartId },
          });

          if (!part) {
            logger.error('Spare part not found', { sparePartId });
            await queryRunner.rollbackTransaction();
            channel.ack(msg);
            return;
          }

          // Deduct quantity
          part.quantity -= quantity;
          await queryRunner.manager.save(part);
          await queryRunner.manager.save(ProcessedInvoiceItem, { invoiceItemId });

          await queryRunner.commitTransaction();

          logger.info('Spare part stock reduced successfully (Idempotent)', {
            sparePartId,
            deducted: quantity,
            invoiceItemId,
          });
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } else {
        const repo = new SparePartRepository();
        const part = await repo.findById(sparePartId);

        if (!part) {
          logger.error('Spare part not found', { sparePartId });
          channel.ack(msg);
          return;
        }

        // Deduct quantity
        await repo.updateStock(sparePartId, -quantity);

        logger.info('Spare part stock reduced successfully (Legacy)', {
          sparePartId,
          deducted: quantity,
        });
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('Spare part reduction consumer failed', error);
      channel.nack(msg, false, false);
    }
  });

  logger.info('Spare part reduction consumer started and listening');
}
