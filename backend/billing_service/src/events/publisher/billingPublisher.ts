import { getRabbitChannel } from '../../config/rabbitmq';
import { BillingEventType, InvoiceCreatedEvent } from '../billingEvents';

const EXCHANGE = 'domain_events';

export async function publishInvoiceCreated(payload: InvoiceCreatedEvent) {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', {
    durable: true,
  });

  channel.publish(
    EXCHANGE,
    BillingEventType.INVOICE_CREATED,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true },
  );
}
