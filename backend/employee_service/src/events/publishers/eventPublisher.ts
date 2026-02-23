import { getRabbitChannel } from '../../config/rabbitmq';
import { EmployeeEventType } from '../employeeEvents';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';

export async function publishEmployeeEvent(routingKey: EmployeeEventType, payload: object) {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });

  logger.info('Employee event published', { routingKey });
}
