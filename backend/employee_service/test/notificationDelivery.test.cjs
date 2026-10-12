const { randomUUID } = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const amqp = require('amqplib');
const { publishConfirmed } = require('../dist/utils/confirmedPublish');
const {
  NOTIFICATION_ROUTING_KEYS,
  notificationRetryDelay,
  quarantineNotification,
  republishNotificationRetry,
  retryNotificationDelivery,
  shouldRetryNotification,
  validateNotificationJob,
} = require('../dist/workers/notificationDelivery');

const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;

test('notification validation rejects malformed recipients and payload fields', () => {
  assert.equal(validateNotificationJob('notification.in_app.request', {
    recipients: ['employee-1'], title: 'Ticket update', message: 'Assigned',
  }, 'event-001'), null);
  assert.match(validateNotificationJob('notification.in_app.request', {
    recipients: [''], title: 'Ticket update', message: 'Assigned',
  }, 'event-001'), /recipient IDs/);
  assert.match(validateNotificationJob('notification.in_app.request', {
    recipients: 'employee-1', title: 'Ticket update', message: 'Assigned',
  }, 'event-001'), /array/);
  assert.match(validateNotificationJob('notification.email.request', {
    recipient: 'person@example.test', body: '',
  }, 'event-001'), /body/);
  assert.match(validateNotificationJob('notification.in_app.request', {
    recipients: ['employee-1'], title: 'Ticket update', message: 'Assigned',
  }), /event ID/);
  assert.deepEqual(NOTIFICATION_ROUTING_KEYS, [
    'notification.email.request',
    'notification.whatsapp.request',
    'notification.in_app.request',
  ]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(notificationRetryDelay), [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  assert.equal(shouldRetryNotification(4), true);
  assert.equal(shouldRetryNotification(5), false);
});

test('confirmed retry preserves the original routing key and becomes consumable', {
  skip: !brokerUrl && 'Set NOTIFICATION_TEST_RABBITMQ_URL to run isolated RabbitMQ integration test',
}, async () => {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createConfirmChannel();
  let queue;
  try {
    await channel.assertExchange('domain_events', 'topic', { durable: true });
    const queueResult = await channel.assertQueue('', { exclusive: true, autoDelete: true });
    queue = queueResult.queue;
    await channel.bindQueue(queue, 'domain_events', 'notification.in_app.request');

    const payload = Buffer.from(JSON.stringify({ recipients: ['employee-1'], title: 'Ticket', message: 'Assigned' }));
    await publishConfirmed(channel, 'domain_events', 'notification.in_app.request', payload);
    const original = await channel.get(queue, { noAck: false });
    assert.ok(original);
    assert.equal(original.fields.routingKey, 'notification.in_app.request');

    await republishNotificationRetry(channel, original, original.fields.routingKey, 0);
    channel.ack(original);

    const retry = await channel.get(queue, { noAck: false });
    assert.ok(retry);
    assert.equal(retry.fields.routingKey, 'notification.in_app.request');
    assert.equal(retry.properties.headers['x-retry-count'], 1);
    assert.equal(retry.properties.messageId, original.properties.messageId);
    assert.deepEqual(retry.content, payload);
    channel.ack(retry);
    assert.equal((await channel.get(queue, { noAck: false })), false);
  } finally {
    if (queue) await channel.deleteQueue(queue).catch(() => undefined);
    await channel.close().catch(() => undefined);
    await connection.close();
  }
});

test('confirmed publish rejects an unroutable notification', {
  skip: !brokerUrl && 'Set NOTIFICATION_TEST_RABBITMQ_URL to run isolated RabbitMQ integration test',
}, async () => {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createConfirmChannel();
  const exchange = `notification-unroutable-${randomUUID()}`;
  try {
    await channel.assertExchange(exchange, 'topic', { durable: false, autoDelete: true });
    await assert.rejects(
      publishConfirmed(channel, exchange, 'notification.in_app.request', Buffer.from('{}')),
      /did not route/,
    );
  } finally {
    await channel.deleteExchange(exchange).catch(() => undefined);
    await channel.close().catch(() => undefined);
    await connection.close();
  }
});

test('retry and dead-letter publish failures leave deliveries recoverable', {
  skip: !brokerUrl && 'Set NOTIFICATION_TEST_RABBITMQ_URL to run isolated RabbitMQ integration test',
}, async () => {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createConfirmChannel();
  const exchange = `notification-failure-${randomUUID()}`;
  const queue = `notification-failure-${randomUUID()}`;
  const deadQueue = `notification-dead-${randomUUID()}`;
  const disconnectQueue = `notification-disconnect-${randomUUID()}`;
  let channelClosed = false;
  try {
    await channel.assertExchange(exchange, 'topic', { durable: false, autoDelete: false });
    await channel.assertQueue(queue, { durable: false, autoDelete: false });
    await channel.bindQueue(queue, exchange, 'notification.in_app.request');
    const eventId = randomUUID();
    const body = Buffer.from(JSON.stringify({ recipients: ['recipient'], title: 'T', message: 'M' }));
    await publishConfirmed(channel, exchange, 'notification.in_app.request', body, { messageId: eventId });
    let delivery = await channel.get(queue, { noAck: false });
    assert.ok(delivery);

    await channel.unbindQueue(queue, exchange, 'notification.in_app.request');
    assert.equal(await retryNotificationDelivery(channel, delivery, 'notification.in_app.request', 0, exchange), false);
    delivery = await channel.get(queue, { noAck: false });
    assert.ok(delivery);
    assert.equal(delivery.fields.redelivered, true);

    assert.equal(await quarantineNotification(channel, delivery, 'test failure', deadQueue), false);
    delivery = await channel.get(queue, { noAck: false });
    assert.ok(delivery);
    assert.equal(delivery.fields.redelivered, true);

    await channel.assertQueue(deadQueue, { durable: false, autoDelete: false });
    assert.equal(await quarantineNotification(channel, delivery, 'test quarantine', deadQueue), true);
    const deadLetter = await channel.get(deadQueue, { noAck: true });
    assert.ok(deadLetter);
    assert.equal(deadLetter.properties.headers['x-dead-letter-reason'], 'test quarantine');
    assert.equal(deadLetter.properties.headers['x-original-routing-key'], 'notification.in_app.request');

    await channel.assertQueue(disconnectQueue, { durable: false, autoDelete: false });
    await channel.bindQueue(disconnectQueue, exchange, 'notification.in_app.request');
    await publishConfirmed(channel, exchange, 'notification.in_app.request', body, { messageId: randomUUID() });
    const beforeDisconnect = await channel.get(disconnectQueue, { noAck: false });
    assert.ok(beforeDisconnect);
    await channel.close(); // Broker requeues the unacked source when the worker channel drops.
    channelClosed = true;
    assert.equal(await retryNotificationDelivery(channel, beforeDisconnect, beforeDisconnect.fields.routingKey, 0, exchange), false);

    const recoveredChannel = await connection.createConfirmChannel();
    const afterDisconnect = await recoveredChannel.get(disconnectQueue, { noAck: false });
    assert.ok(afterDisconnect);
    assert.equal(afterDisconnect.fields.redelivered, true);
    recoveredChannel.ack(afterDisconnect);
    await recoveredChannel.deleteQueue(disconnectQueue);
    await recoveredChannel.deleteQueue(queue);
    await recoveredChannel.deleteQueue(deadQueue);
    await recoveredChannel.deleteExchange(exchange);
    await recoveredChannel.close();
  } finally {
    if (!channelClosed) await channel.close().catch(() => undefined);
    await connection.close();
  }
});
