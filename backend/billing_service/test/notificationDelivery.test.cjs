const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');
const { publishConfirmed } = require('../src/utils/publishConfirmed');
const { sendEmployeeInternalNotification } = require('../src/utils/employeeInternalNotification');

const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;

class FakeConfirmChannel extends EventEmitter {
  constructor({ backpressure = false, confirmError = null, returnMessage = false } = {}) {
    super();
    this.backpressure = backpressure;
    this.confirmError = confirmError;
    this.returnMessage = returnMessage;
    this.sent = [];
  }

  publish(exchange, routingKey, content, options, callback) {
    this.sent.push({ exchange, routingKey, content, options });
    if (this.returnMessage) {
      setImmediate(() => this.emit('return', { properties: { messageId: options.messageId } }));
    }
    setImmediate(() => callback(this.confirmError));
    if (this.backpressure) setImmediate(() => this.emit('drain'));
    return !this.backpressure;
  }
}

test('publisher waits for broker confirm and drain, and uses persistent mandatory delivery', async () => {
  const channel = new FakeConfirmChannel({ backpressure: true });
  await publishConfirmed(channel, 'domain_events', 'notification.in_app.request', Buffer.from('{}'));
  assert.equal(channel.sent.length, 1);
  assert.equal(channel.sent[0].options.persistent, true);
  assert.equal(channel.sent[0].options.mandatory, true);
  assert.ok(channel.sent[0].options.messageId);
});

test('publisher reports broker nack and unroutable publish as failures', async () => {
  await assert.rejects(
    publishConfirmed(new FakeConfirmChannel({ confirmError: new Error('nack') }), 'domain_events', 'notification.in_app.request', Buffer.from('{}')),
    /nack/,
  );
  await assert.rejects(
    publishConfirmed(new FakeConfirmChannel({ returnMessage: true }), 'domain_events', 'notification.in_app.request', Buffer.from('{}')),
    /did not route/,
  );
});

test('confirmed Billing publisher delivers to an isolated RabbitMQ queue', {
  skip: !brokerUrl && 'Set NOTIFICATION_TEST_RABBITMQ_URL to run isolated RabbitMQ integration test',
}, async () => {
  const connection = await amqp.connect(brokerUrl);
  const channel = await connection.createConfirmChannel();
  const exchange = `billing-notification-${randomUUID()}`;
  let queue;
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
});

test('Billing internal notification client uses the service JWT contract and rejects HTTP errors', async () => {
  const oldSecret = process.env.ACCESS_SECRET;
  const oldUrl = process.env.EMPLOYEE_SERVICE_URL;
  process.env.ACCESS_SECRET = 'test-only-signing-key';
  process.env.EMPLOYEE_SERVICE_URL = 'http://employee.test';
  try {
    let request;
    const fakeFetch = async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201 };
    };
    await sendEmployeeInternalNotification({ employee_id: 'employee-1', title: 'Title', message: 'Body' }, fakeFetch);
    assert.equal(request.url, 'http://employee.test/notifications/internal');
    assert.equal(request.options.headers['x-internal-service'], 'billing');
    const token = request.options.headers.Authorization.replace('Bearer ', '');
    const decoded = jwt.decode(token);
    assert.equal(decoded.userId, 'billing_service');
    assert.equal(decoded.role, 'ADMIN');
    assert.ok(decoded.exp > decoded.iat);

    await assert.rejects(
      sendEmployeeInternalNotification({ employee_id: 'employee-1', title: 'Title', message: 'Body' }, async () => ({ ok: false, status: 403 })),
      /HTTP 403/,
    );
    await assert.rejects(
      sendEmployeeInternalNotification({ employee_id: 'employee-1', title: 'Title', message: 'Body' }, async () => ({ ok: false, status: 500 })),
      /HTTP 500/,
    );
  } finally {
    if (oldSecret === undefined) delete process.env.ACCESS_SECRET;
    else process.env.ACCESS_SECRET = oldSecret;
    if (oldUrl === undefined) delete process.env.EMPLOYEE_SERVICE_URL;
    else process.env.EMPLOYEE_SERVICE_URL = oldUrl;
  }
});
