// billing/events/productStatusEvent.ts
import { getRabbitChannel } from '../../config/rabbitmq';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'inventory.product.status.update';

export async function emitProductStatusUpdate(payload: {
  productId: string;
  billType: 'SALE' | 'RENT' | 'LEASE';
  invoiceId: string;
  approvedBy: string;
  approvedAt: Date;
}) {
  const channel = await getRabbitChannel();

  // Ensure exchange exists
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  const eventPayload = {
    eventId: uuidv4(),
    billId: payload.invoiceId,
    invoiceId: payload.invoiceId,
    productId: payload.productId,
    branchId: '', // Will be populated if needed
    billType: payload.billType,
    approvedBy: payload.approvedBy,
    approvedAt: payload.approvedAt.toISOString(),
  };

  channel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(eventPayload)), {
    persistent: true,
  });

  logger.info('Published PRODUCT_STATUS_UPDATE event', {
    eventId: eventPayload.eventId,
    productId: payload.productId,
    billType: payload.billType,
  });
}
