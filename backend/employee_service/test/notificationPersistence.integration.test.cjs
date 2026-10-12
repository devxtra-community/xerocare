const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const amqp = require('amqplib');
const { persistInAppNotifications } = require('../dist/services/notificationPersistence');
const { publishConfirmed } = require('../dist/utils/confirmedPublish');

const databaseUrl = process.env.XEROCARE_ISOLATED_TEST_DATABASE_URL;
const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;

test('notification persistence deduplicates redelivery and rolls back failed recipient batches', {
  skip: !databaseUrl && 'Set XEROCARE_ISOLATED_TEST_DATABASE_URL to an isolated local PostgreSQL database',
}, async () => {
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname), 'test database must be local');
  assert.equal(parsed.port, '55432', 'test database must use the disposable test port');

  const owner = new Client({ connectionString: databaseUrl });
  await owner.connect();
  const schema = `batch2c_${randomUUID().replaceAll('-', '')}`;
  let sibling;
  try {
    await owner.query(`CREATE SCHEMA ${schema}`);
    await owner.query(`SET search_path TO ${schema}`);
    await owner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'INFO',
        data JSONB NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await owner.query(`INSERT INTO notifications (employee_id, title, message) VALUES ('legacy', 'Legacy', 'Before migration')`);
    const migration = await readFile(
      path.join(__dirname, '../src/migrations/202610120001-add-notification-event-id.sql'),
      'utf8',
    );
    await owner.query(migration);
    await owner.query(migration); // The migration is safe to re-run.
    const legacy = await owner.query(`SELECT event_id FROM notifications WHERE employee_id = 'legacy'`);
    assert.equal(legacy.rows[0].event_id, null);

    const eventId = `event-${randomUUID()}`;
    await owner.query('BEGIN');
    await persistInAppNotifications(owner, eventId, ['employee-a', 'employee-b', 'employee-a'], {
      title: 'Ticket update', message: 'Assigned', type: 'INFO', data: { referenceId: 'ticket-1' },
    });
    await owner.query('COMMIT');

    // This is the save-completed/ack-lost window: processing the same stable event again
    // does not add a second row for either recipient.
    sibling = new Client({ connectionString: databaseUrl });
    await sibling.connect();
    await sibling.query(`SET search_path TO ${schema}`);
    await sibling.query('BEGIN');
    await persistInAppNotifications(sibling, eventId, ['employee-a', 'employee-b'], {
      title: 'Ticket update', message: 'Assigned', type: 'INFO', data: { referenceId: 'ticket-1' },
    });
    await sibling.query('COMMIT');

    const rows = await owner.query(
      `SELECT employee_id, event_id FROM notifications WHERE event_id = $1 ORDER BY employee_id`,
      [eventId],
    );
    assert.deepEqual(rows.rows.map((row) => row.employee_id), ['employee-a', 'employee-b']);

    const concurrentEventId = `event-${randomUUID()}`;
    const persistConcurrentCopy = async (client) => {
      await client.query('BEGIN');
      try {
        await persistInAppNotifications(client, concurrentEventId, ['employee-c', 'employee-d'], {
          title: 'Concurrent event', message: 'Same logical event',
        });
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    };
    await Promise.all([persistConcurrentCopy(owner), persistConcurrentCopy(sibling)]);
    const concurrentRows = await owner.query(
      `SELECT employee_id FROM notifications WHERE event_id = $1 ORDER BY employee_id`,
      [concurrentEventId],
    );
    assert.deepEqual(concurrentRows.rows.map((row) => row.employee_id), ['employee-c', 'employee-d']);

    await owner.query(`ALTER TABLE notifications ADD CONSTRAINT reject_test_recipient CHECK (employee_id <> 'recipient-fail')`);
    const failedEventId = `event-${randomUUID()}`;
    await owner.query('BEGIN');
    await assert.rejects(
      persistInAppNotifications(owner, failedEventId, ['recipient-good', 'recipient-fail', 'recipient-later'], {
        title: 'Batch failure', message: 'Must be atomic',
      }),
    );
    await owner.query('ROLLBACK');
    const failedRows = await owner.query(`SELECT count(*)::int AS count FROM notifications WHERE event_id = $1`, [failedEventId]);
    assert.equal(failedRows.rows[0].count, 0);
  } finally {
    if (sibling) await sibling.end().catch(() => undefined);
    await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await owner.end();
  }
});

test('RabbitMQ redelivery after PostgreSQL commit does not duplicate recipient rows', {
  skip: (!databaseUrl || !brokerUrl) && 'Set isolated PostgreSQL and RabbitMQ test URLs',
}, async () => {
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname), 'test database must be local');
  assert.equal(parsed.port, '55432', 'test database must use the disposable test port');
  const owner = new Client({ connectionString: databaseUrl });
  await owner.connect();
  const schema = `batch2c_redelivery_${randomUUID().replaceAll('-', '')}`;
  const connection = await amqp.connect(brokerUrl);
  const producer = await connection.createConfirmChannel();
  const queue = `notification-redelivery-${randomUUID()}`;
  let consumer;
  try {
    await owner.query(`CREATE SCHEMA ${schema}`);
    await owner.query(`SET search_path TO ${schema}`);
    await owner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), employee_id VARCHAR NOT NULL,
        title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) NOT NULL DEFAULT 'INFO',
        data JSONB NULL, is_read BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migration = await readFile(
      path.join(__dirname, '../src/migrations/202610120001-add-notification-event-id.sql'),
      'utf8',
    );
    await owner.query(migration);

    await producer.assertExchange('domain_events', 'topic', { durable: true });
    await producer.assertQueue(queue, { durable: false, autoDelete: false });
    await producer.bindQueue(queue, 'domain_events', 'notification.in_app.request');
    const eventId = randomUUID();
    const body = Buffer.from(JSON.stringify({
      recipients: ['redelivery-a', 'redelivery-b'],
      title: 'Crash window', message: 'Persisted before ack', type: 'INFO',
    }));
    await publishConfirmed(producer, 'domain_events', 'notification.in_app.request', body, { messageId: eventId });

    consumer = await connection.createChannel();
    const first = await consumer.get(queue, { noAck: false });
    assert.ok(first);
    await owner.query('BEGIN');
    await persistInAppNotifications(owner, first.properties.messageId, ['redelivery-a', 'redelivery-b'], {
      title: 'Crash window', message: 'Persisted before ack', type: 'INFO',
    });
    await owner.query('COMMIT');
    await consumer.close(); // Simulated worker crash after commit but before ack.

    consumer = await connection.createChannel();
    let redelivery = false;
    const until = Date.now() + 5000;
    let message = null;
    while (!message && Date.now() < until) {
      message = await consumer.get(queue, { noAck: false });
      if (!message) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.ok(message, 'unacked delivery should return to the queue');
    redelivery = message.fields.redelivered;
    assert.equal(redelivery, true);
    assert.equal(message.properties.messageId, eventId);

    await owner.query('BEGIN');
    await persistInAppNotifications(owner, message.properties.messageId, ['redelivery-a', 'redelivery-b'], {
      title: 'Crash window', message: 'Persisted before ack', type: 'INFO',
    });
    await owner.query('COMMIT');
    consumer.ack(message);

    const rows = await owner.query(`SELECT employee_id FROM notifications WHERE event_id = $1 ORDER BY employee_id`, [eventId]);
    assert.deepEqual(rows.rows.map((row) => row.employee_id), ['redelivery-a', 'redelivery-b']);
  } finally {
    if (consumer) await consumer.close().catch(() => undefined);
    await producer.deleteQueue(queue).catch(() => undefined);
    await producer.close().catch(() => undefined);
    await connection.close();
    await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await owner.end();
  }
});
