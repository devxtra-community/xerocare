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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), employee_id VARCHAR NOT NULL,
        title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) NOT NULL DEFAULT 'INFO',
        data JSONB NULL, is_read BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migration = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../src/migrations/202610120001-add-notification-event-id.sql'),
      'utf8',
    );
    await Source.query(migration);

    const app = express();
    app.use(express.json());
    app.post('/notifications/internal', authMiddleware, NotificationController.createInternal);
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/notifications/internal`;
    const request = (token) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ employee_id: 'billing-recipient', title: 'Billing event', message: 'Persisted' }),
    });

    const billingToken = jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, testSecret, { expiresIn: '1m' });
    const accepted = await request(billingToken);
    assert.equal(accepted.status, 201);
    const stored = await Source.query(
      `SELECT employee_id, title, message, is_read, event_id FROM notifications WHERE employee_id = $1`,
      ['billing-recipient'],
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0].title, 'Billing event');
    assert.equal(stored[0].is_read, false);
    assert.equal(stored[0].event_id, null);

    assert.equal((await request(jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, 'wrong-test-key', { expiresIn: '1m' }))).status, 401);
    assert.equal((await request(jwt.sign({ userId: 'billing_service', role: 'ADMIN' }, testSecret, { expiresIn: '-1s' }))).status, 401);
    assert.equal((await request(jwt.sign({ userId: 'vendor_service', role: 'ADMIN' }, testSecret, { expiresIn: '1m' }))).status, 403);
    const finalCount = await Source.query(`SELECT count(*)::int AS count FROM notifications WHERE employee_id = $1`, ['billing-recipient']);
    assert.equal(finalCount[0].count, 1);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (Source?.isInitialized) {
      await Source.query(`DROP TABLE IF EXISTS notifications`);
      await Source.destroy();
    }
    if (oldDatabaseUrl === undefined) delete process.env.EMPLOYEE_DATABASE_URL;
    else process.env.EMPLOYEE_DATABASE_URL = oldDatabaseUrl;
    if (oldAccessSecret === undefined) delete process.env.ACCESS_SECRET;
    else process.env.ACCESS_SECRET = oldAccessSecret;
  }
});
