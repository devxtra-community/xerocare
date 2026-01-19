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
