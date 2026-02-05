import { getRabbitChannel } from '../../config/rabbitmq';
import { Source } from '../../config/db';
import { EmployeeManager } from '../../entities/employeeManagerEntity';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const QUEUE = 'veninv.employee.events';

export async function startEmployeeConsumer() {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, 'employee.*');

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const routingKey = msg.fields.routingKey;
      const event = JSON.parse(msg.content.toString());
      const repo = Source.getRepository(EmployeeManager);

      if (routingKey === 'employee.deleted') {
        await repo.delete({ employee_id: event.employeeId });
        channel.ack(msg);
        return;
      }

      if (event.role !== 'MANAGER') {
        await repo.delete({ employee_id: event.employeeId });
        channel.ack(msg);
        return;
      }

      await repo.upsert(
        {
          employee_id: event.employeeId,
          email: event.email,
          status: event.status.toUpperCase(),
        },
        ['employee_id'],
      );

      channel.ack(msg);
    } catch (err) {
      logger.error('Employee consumer failed', err);
    }
  });

  logger.info('Employee consumer started and listening for events');
}

export async function productStatusChangeconsumer() {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue('billing.product.status.queue', { durable: true });
  await channel.bindQueue(
    'billing.product.status.queue',
    EXCHANGE,
    'billing.product.status_updated',
  );

  channel.consume('billing.product.status.queue', async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      logger.info(`Received product status update for saleType: ${event.saleType}`);
      // Handle the product status update logic here

      channel.ack(msg);
    } catch (err) {
      logger.error('Product status change consumer failed', err);
    }
  });

  logger.info('Product status change consumer started and listening for events');
}
