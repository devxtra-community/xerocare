import { getRabbitChannel } from '../../config/rabbitmq';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';

export const emitProductAllocate = async (payload: {
  serialNumber: string;
  invoiceId: string;
  invoiceItemId: string;
  action: 'SALE';
}) => {
  try {
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    channel.publish(EXCHANGE, 'inventory.product.allocate', Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    logger.info('Emitted inventory.product.allocate event', { payload });
  } catch (error) {
    logger.error('Failed to emit inventory.product.allocate event', error);
  }
};

export const emitSparePartReduce = async (payload: {
  sparePartId: string;
  quantity: number;
  invoiceId: string;
  invoiceItemId: string;
}) => {
  try {
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    channel.publish(EXCHANGE, 'inventory.sparepart.reduce', Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    logger.info('Emitted inventory.sparepart.reduce event', { payload });
  } catch (error) {
    logger.error('Failed to emit inventory.sparepart.reduce event', error);
  }
};
