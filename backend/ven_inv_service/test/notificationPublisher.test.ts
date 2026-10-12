/* eslint-disable @typescript-eslint/no-explicit-any -- Test double captures opaque AMQP publish options. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import amqp from 'amqplib';
import type { ConfirmChannel } from 'amqplib';
import { publishConfirmed } from '../src/utils/publishConfirmed';

const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;

class FakeConfirmChannel extends EventEmitter {
  sent: Array<{ exchange: string; routingKey: string; options: any }> = [];
  publish(
    exchange: string,
    routingKey: string,
    _content: Buffer,
    options: any,
    callback: (error?: Error | null) => void,
  ) {
    this.sent.push({ exchange, routingKey, options });
    setImmediate(() => callback());
    return true;
  }
}

test('Vendor publisher helper waits for broker confirmation and mandatory routing', async () => {
  const fake = new FakeConfirmChannel();
  await publishConfirmed(
    fake as unknown as ConfirmChannel,
    'domain_events',
    'notification.in_app.request',
    Buffer.from('{}'),
  );
  assert.equal(fake.sent[0].options.persistent, true);
  assert.equal(fake.sent[0].options.mandatory, true);
  assert.equal(fake.sent[0].routingKey, 'notification.in_app.request');
});

test('Vendor publisher helper propagates broker nacks', async () => {
  const fake = new FakeConfirmChannel();
  fake.publish = (_exchange, _routingKey, _content, _options, callback) => {
    setImmediate(() => callback(new Error('nack')));
    return true;
  };
  await assert.rejects(
    publishConfirmed(
      fake as unknown as ConfirmChannel,
      'domain_events',
      'notification.in_app.request',
      Buffer.from('{}'),
    ),
    /nack/,
  );
});

test(
  'confirmed Vendor publisher delivers to an isolated RabbitMQ queue',
  {
    skip:
      !brokerUrl && 'Set NOTIFICATION_TEST_RABBITMQ_URL to run isolated RabbitMQ integration test',
  },
  async () => {
    const connection = await amqp.connect(brokerUrl!);
    const channel = await connection.createConfirmChannel();
    const exchange = `vendor-notification-${randomUUID()}`;
    let queue: string | undefined;
    try {
      await channel.assertExchange(exchange, 'topic', { durable: false, autoDelete: true });
      queue = (await channel.assertQueue('', { exclusive: true, autoDelete: true })).queue;
      await channel.bindQueue(queue, exchange, 'notification.test');
      const body = Buffer.from(JSON.stringify({ event: 'test-only' }));
      await publishConfirmed(channel, exchange, 'notification.test', body);
      const message = await channel.get(queue, { noAck: true });
      assert.ok(message);
      assert.deepEqual(message.content, body);
    } finally {
      if (queue) await channel.deleteQueue(queue).catch(() => undefined);
      await channel.deleteExchange(exchange).catch(() => undefined);
      await channel.close().catch(() => undefined);
      await connection.close();
    }
  },
);
