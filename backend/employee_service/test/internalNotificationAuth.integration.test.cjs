const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const databaseUrl = process.env.XEROCARE_ISOLATED_TEST_DATABASE_URL;
const testSecret = 'disposable-test-signing-key-only';

test('service JWT auth creates internal notifications only for Billing', {
  skip: !databaseUrl && 'Set XEROCARE_ISOLATED_TEST_DATABASE_URL to an isolated local PostgreSQL database',
}, async () => {
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname), 'test database must be local');
  assert.equal(parsed.port, '55432', 'test database must use the disposable test port');

  const oldDatabaseUrl = process.env.EMPLOYEE_DATABASE_URL;
  const oldAccessSecret = process.env.ACCESS_SECRET;
  process.env.EMPLOYEE_DATABASE_URL = databaseUrl;
  process.env.ACCESS_SECRET = testSecret;

  let Source;
  let server;
  try {
    ({ Source } = require('../dist/config/dataSource'));
    const { authMiddleware } = require('../dist/middleware/authMiddleware');
    const { NotificationController } = require('../dist/controllers/notificationController');
    await Source.initialize();
    await Source.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), employee_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) NOT NULL DEFAULT 'INFO',
        data JSONB NULL, is_read BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await Source.query(`CREATE INDEX IF NOT EXISTS idx_notifications_employee_id_test ON notifications (employee_id)`);
    await Source.query(
      `INSERT INTO notifications (employee_id, title, message, is_read, data) VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy title', 'Legacy body', true, '{"legacy":true}'::jsonb)`,
    );
    await assert.rejects(
      Source.query('SELECT event_id FROM notifications'),
      (error) => error.code === '42703',
      'the regression fixture must reproduce the original missing-column error',
    );
    const applied = await Source.runMigrations();
    assert.deepEqual(applied.map((migration) => migration.name), ['AddNotificationEventId1791763260000']);
    assert.deepEqual(await Source.runMigrations(), [], 'TypeORM history should prevent a second application');
    const eventColumn = await Source.query(
      `SELECT data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='notifications' AND column_name='event_id'`,
    );
    assert.deepEqual(eventColumn[0], {
      data_type: 'character varying', character_maximum_length: 100, is_nullable: 'YES',
    });
    const index = await Source.query(
      `SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename='notifications' AND indexname='uq_notifications_event_recipient'`,
    );
    assert.equal(index.length, 1);
    assert.match(index[0].indexdef, /UNIQUE INDEX uq_notifications_event_recipient ON .*\(event_id, employee_id\) WHERE \(event_id IS NOT NULL\)/);
    const legacy = await Source.query(
      `SELECT employee_id, title, message, is_read, data, event_id FROM notifications WHERE employee_id='00000000-0000-0000-0000-000000000001'`,
    );
    assert.deepEqual(legacy[0], {
      employee_id: '00000000-0000-0000-0000-000000000001', title: 'Legacy title', message: 'Legacy body',
      is_read: true, data: { legacy: true }, event_id: null,
    });
    await Source.query(
      `INSERT INTO notifications (employee_id,title,message,event_id) VALUES ('00000000-0000-0000-0000-000000000004','Event one','A','shared-event'), ('00000000-0000-0000-0000-000000000005','Event one','B','shared-event'), ('00000000-0000-0000-0000-000000000004','Direct one','A',NULL), ('00000000-0000-0000-0000-000000000004','Direct two','A',NULL)`,
    );
    await assert.rejects(
      Source.query(`INSERT INTO notifications (employee_id,title,message,event_id) VALUES ('00000000-0000-0000-0000-000000000004','Duplicate','A','shared-event')`),
      (error) => error.code === '23505',
      'same event and recipient must be rejected',
    );

    const app = express();
    app.use(express.json());
    app.get('/notifications/my', authMiddleware, NotificationController.getMyNotifications);
    app.put('/notifications/:id/read', authMiddleware, NotificationController.markAsRead);
    app.post('/notifications/internal', authMiddleware, NotificationController.createInternal);
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/notifications/internal`;
    const request = (token) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ employee_id: '00000000-0000-0000-0000-000000000006', title: 'Billing event', message: 'Persisted' }),
    });

    const billingToken = jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, testSecret, { expiresIn: '1m' });
    await Source.query(
      `INSERT INTO notifications (employee_id, title, message) VALUES ('00000000-0000-0000-0000-000000000002', 'Own notice', 'Visible'), ('00000000-0000-0000-0000-000000000003', 'Other notice', 'Private')`,
    );
    const employeeToken = jwt.sign({ userId: '00000000-0000-0000-0000-000000000002', role: 'EMPLOYEE' }, testSecret, { expiresIn: '1m' });
    const mine = await fetch(`http://127.0.0.1:${server.address().port}/notifications/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert.equal(mine.status, 200);
    const mineBody = await mine.json();
    assert.equal(mineBody.total, 1);
    assert.deepEqual(mineBody.notifications.map((notification) => notification.employee_id), ['00000000-0000-0000-0000-000000000002']);
    assert.equal(mineBody.unreadCount, 1);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/notifications/my`)).status, 401);
    const otherId = (await Source.query(`SELECT id FROM notifications WHERE employee_id='00000000-0000-0000-0000-000000000003'`))[0].id;
    const ownHeaders = { Authorization: `Bearer ${employeeToken}` };
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/notifications/${otherId}/read`, { method: 'PUT', headers: ownHeaders })).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/notifications/${mineBody.notifications[0].id}/read`, { method: 'PUT', headers: ownHeaders })).status, 200);
    const afterRead = await (await fetch(`http://127.0.0.1:${server.address().port}/notifications/my`, { headers: ownHeaders })).json();
    assert.equal(afterRead.unreadCount, 0);
    assert.equal(afterRead.notifications[0].is_read, true);

    const accepted = await request(billingToken);
    assert.equal(accepted.status, 201);
    const stored = await Source.query(
      `SELECT employee_id, title, message, is_read, event_id FROM notifications WHERE employee_id = $1`,
      ['00000000-0000-0000-0000-000000000006'],
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0].title, 'Billing event');
    assert.equal(stored[0].is_read, false);
    assert.equal(stored[0].event_id, null);

    assert.equal((await request(jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, 'wrong-test-key', { expiresIn: '1m' }))).status, 401);
    assert.equal((await request(jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, testSecret, { expiresIn: '-1s' }))).status, 401);
    assert.equal((await request(jwt.sign({ userId: 'vendor_service', role: 'ADMIN' }, testSecret, { expiresIn: '1m' }))).status, 403);
    const finalCount = await Source.query(`SELECT count(*)::int AS count FROM notifications WHERE employee_id = $1`, ['00000000-0000-0000-0000-000000000006']);
    assert.equal(finalCount[0].count, 1);

    await Source.undoLastMigration();
    const preservedEvents = await Source.query(
      `SELECT employee_id, event_id FROM notifications WHERE event_id='shared-event' ORDER BY employee_id`,
    );
    assert.deepEqual(preservedEvents.map((row) => row.employee_id), ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005']);
    const afterRollback = await Source.query(`SELECT event_id FROM notifications WHERE employee_id='00000000-0000-0000-0000-000000000001'`);
    assert.equal(afterRollback[0].event_id, null);
    assert.equal((await Source.query(`SELECT to_regclass('uq_notifications_event_recipient') AS idx`))[0].idx, null);
    await Source.runMigrations();
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (Source?.isInitialized) {
      await Source.query(`DELETE FROM employee_service_migrations WHERE name = 'AddNotificationEventId1791763260000'`).catch(() => undefined);
      await Source.query(`DROP TABLE IF EXISTS notifications`);
      await Source.destroy();
    }
    if (oldDatabaseUrl === undefined) delete process.env.EMPLOYEE_DATABASE_URL;
    else process.env.EMPLOYEE_DATABASE_URL = oldDatabaseUrl;
    if (oldAccessSecret === undefined) delete process.env.ACCESS_SECRET;
    else process.env.ACCESS_SECRET = oldAccessSecret;
  }
});
