import { getRabbitChannel } from './src/config/rabbitmq';
import { logger } from './src/config/logger';
import { v4 as uuidv4 } from 'uuid';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'inventory.product.status.update';

async function testEventEmission() {
  try {
    const channel = await getRabbitChannel();
    logger.info('RabbitMQ connected');

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    const testEvent = {
      eventId: uuidv4(),
      productId: 'TEST-PRODUCT-ID', // Replace with actual product ID
      billType: 'RENT',
      invoiceId: 'TEST-INVOICE',
      approvedBy: 'TEST-USER',
      approvedAt: new Date().toISOString(),
    };

    logger.info('Publishing test event', testEvent);

    channel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(testEvent)), {
      persistent: true,
    });

    logger.info('Test event published successfully');

    setTimeout(() => {
      logger.info('Check inventory service logs for event reception');
      process.exit(0);
    }, 2000);
  } catch (error) {
    logger.error('Test failed', error);
    process.exit(1);
  }
}

testEventEmission();
