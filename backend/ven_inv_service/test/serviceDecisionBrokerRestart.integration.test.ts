import assert from 'node:assert/strict';
import amqp from 'amqplib';
import { publishConfirmed } from '../src/utils/publishConfirmed';

const RETRY_QUEUE = 'veninv.billing.service-estimate-decisions.retry';
const DEAD_QUEUE = 'veninv.billing.service-estimate-decisions.dead';
const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'billing.service-estimate.finance-decision';
const retryId = 'broker-restart-retry-fixture';
const deadId = 'broker-restart-dead-fixture';
const retryPayload = Buffer.from('{"fixture":"queued-retry"}');
const deadPayload = Buffer.from('{"fixture":"queued-dead-letter"}');

async function main() {
  const url = process.env.RABBITMQ_URL;
  assert.ok(url?.includes('127.0.0.1:5673'), 'RABBITMQ_URL must target the disposable broker');
  const mode = process.argv[2];
  assert.ok(
    mode === 'seed' || mode === 'verify',
    'Use seed before broker restart and verify after restart',
  );
  const connection = await amqp.connect(url);
  const channel = await connection.createConfirmChannel();
  try {
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGE, 'x-dead-letter-routing-key': ROUTING_KEY },
    });
    await channel.assertQueue(DEAD_QUEUE, { durable: true });
    if (mode === 'seed') {
      await channel.purgeQueue(RETRY_QUEUE);
      await channel.purgeQueue(DEAD_QUEUE);
      await publishConfirmed(channel, '', RETRY_QUEUE, retryPayload, {
        messageId: retryId,
        contentType: 'application/json',
        expiration: '60000',
        headers: { 'x-service-estimate-retry-count': 2 },
      });
      await publishConfirmed(channel, '', DEAD_QUEUE, deadPayload, {
        messageId: deadId,
        contentType: 'application/json',
        headers: { 'x-dead-letter-reason': 'restart persistence fixture' },
      });
      console.log('Persistent retry and DLQ fixtures confirmed before broker restart');
    } else {
      const retry = await channel.get(RETRY_QUEUE, false);
      const dead = await channel.get(DEAD_QUEUE, false);
      assert.ok(retry, 'retry message must survive broker restart');
      assert.ok(dead, 'DLQ message must survive broker restart');
      assert.equal(retry.properties.messageId, retryId);
      assert.deepEqual(retry.content, retryPayload);
      assert.equal(dead.properties.messageId, deadId);
      assert.deepEqual(dead.content, deadPayload);
      channel.ack(retry);
      channel.ack(dead);
      console.log(
        'Persistent retry and DLQ fixtures survived broker restart with IDs and payloads unchanged',
      );
    }
  } finally {
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
