const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const databaseUrl = process.env.XEROCARE_BILLING_DECISION_TEST_DATABASE_URL;
const vendorDatabaseUrl = process.env.XEROCARE_SERVICE_DECISION_TEST_DATABASE_URL;
test('linked Finance decisions serialize and outbox delivery recovers after broker and dispatcher outages', {
  skip: (!databaseUrl || !vendorDatabaseUrl) && 'Set both isolated Billing and Vendor/Inventory database URLs',
}, async (t) => {
  assert.ok(databaseUrl, 'Set XEROCARE_BILLING_DECISION_TEST_DATABASE_URL to the disposable Billing database');
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname));
  assert.equal(parsed.port, '55432');
  assert.equal(parsed.pathname, '/billing_estimate_test');
  assert.equal(parsed.password, '');
  const vendorParsed = new URL(vendorDatabaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(vendorParsed.hostname));
  assert.equal(vendorParsed.port, '55432');
  assert.equal(vendorParsed.pathname, '/veninv_estimate_test');
  assert.equal(vendorParsed.password, '');

  process.env.BILLING_DATABASE_URL = databaseUrl;
  process.env.VENDOR_DATABASE_URL = vendorDatabaseUrl;
  const { Source } = require('../src/config/dataSource');
  Source.setOptions({ url: databaseUrl, ssl: false, synchronize: true, dropSchema: true });
  await Source.initialize();
  const { Source: VendorSource } = require('../../ven_inv_service/src/config/db');
  VendorSource.setOptions({ url: vendorDatabaseUrl, ssl: false, synchronize: true, dropSchema: true });
  await VendorSource.initialize();
  const { Invoice } = require('../src/entities/invoiceEntity');
  const { InvoiceStatus } = require('../src/entities/enums/invoiceStatus');
  const { BillType } = require('../src/entities/enums/billType');
  const { SaleType } = require('../src/entities/enums/saleType');
  const { ServiceTicket, ServiceTicketStatus, ServiceContext, JobType } = require('../../ven_inv_service/src/entities/serviceTicketEntity');
  const { ServiceEstimateRevision } = require('../../ven_inv_service/src/entities/serviceEstimateRevisionEntity');
  const vendorDecisionConsumer = require('../../ven_inv_service/src/events/consumers/billingServiceEstimateDecisionConsumer');
  const { BillingService } = require('../src/services/billingService');
  const { flushServiceEstimateDecisionOutbox } = require('../src/services/serviceEstimateDecisionOutbox');
  const { closeRabbitConnection } = require('../src/config/rabbitmq');
  const { NotificationPublisher } = require('../src/events/publisher/notificationPublisher');
  const amqp = require('amqplib');
  const billing = new BillingService();
  const publishNotification = NotificationPublisher.publishInAppRequest;
  NotificationPublisher.publishInAppRequest = async () => undefined;
  const invoiceRepo = Source.getRepository(Invoice);
  const branchId = randomUUID();
  const userId = randomUUID();
  const makeLinkedInvoice = async (revision, ticketId = randomUUID()) => {
    const vendorRevisionId = randomUUID();
    await VendorSource.getRepository(ServiceTicket).save(VendorSource.getRepository(ServiceTicket).create({
      id: ticketId, ticketNumber: `BILL-${randomUUID()}`, productBrand: 'Test', productModel: 'Test', productName: 'Test',
      serialNumber: randomUUID(), serviceContext: ServiceContext.CHARGEABLE, issueDescription: 'Billing handoff fixture',
      jobType: JobType.ONSITE, track: 'B', status: ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
      createdBy: userId, assignedTechnicianId: randomUUID(), branchId,
    }));
    await VendorSource.getRepository(ServiceEstimateRevision).save(VendorSource.getRepository(ServiceEstimateRevision).create({
      id: vendorRevisionId, invoiceId: null, ticketId, billingRevision: revision, submissionCorrelationId: randomUUID(),
      version: revision, revisionNumber: revision, status: 'WAITING_ADDITIONAL_APPROVAL', itemsSnapshot: [],
      labourCost: 0, totalCost: 0, totalAmount: 0, discountApplied: 0, visitChargeAmount: 0,
    }));
    const invoice = await invoiceRepo.save(invoiceRepo.create({
      invoiceNumber: `IT-${randomUUID()}`, branchId, createdBy: userId, serviceTicketId: ticketId,
      billType: BillType.SERVICE, saleType: SaleType.SERVICE, status: InvoiceStatus.WAITING_FINANCE_APPROVAL,
      revisionCount: revision, totalAmount: 100,
    }));
    await VendorSource.getRepository(ServiceEstimateRevision).update({ id: vendorRevisionId }, { invoiceId: invoice.id });
    await Source.query(
      `INSERT INTO billing_service_estimate_revision_links
       (submission_correlation_id, invoice_id, service_ticket_id, vendor_revision_id, billing_revision, request_hash, request_payload)
       VALUES ($1,$2,$3,$4,$5,'test-hash','{}'::jsonb)`,
      [randomUUID(), invoice.id, ticketId, vendorRevisionId, revision],
    );
    return { invoice, ticketId, vendorRevisionId };
  };

  try {
    await Source.query(`CREATE TABLE billing_service_estimate_revision_links (
      submission_correlation_id UUID PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      service_ticket_id UUID NOT NULL, vendor_revision_id UUID NOT NULL, billing_revision INTEGER NOT NULL,
      request_hash VARCHAR(64) NOT NULL, request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE(invoice_id,billing_revision), UNIQUE(vendor_revision_id)
    )`);
    await Source.query(`CREATE TABLE billing_service_estimate_decision_outbox (
      event_id UUID PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      payload JSONB NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMP NOT NULL DEFAULT NOW(),
      lease_until TIMESTAMP, delivered_at TIMESTAMP, last_error TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await Source.query(`CREATE INDEX idx_service_estimate_decision_outbox_pending
      ON billing_service_estimate_decision_outbox(available_at,created_at) WHERE delivered_at IS NULL`);
    await VendorSource.query(`CREATE TABLE billing_decision_inbox (
      event_id UUID PRIMARY KEY, invoice_id UUID NOT NULL, service_ticket_id UUID NOT NULL,
      vendor_revision_id UUID NOT NULL, billing_revision INTEGER NOT NULL, outcome VARCHAR(24) NOT NULL,
      error TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ
    )`);
    await VendorSource.query(`CREATE TABLE service_decision_notification_outbox (
      event_id UUID PRIMARY KEY, recipient_ids JSONB NOT NULL, payload JSONB NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      lease_until TIMESTAMPTZ, delivered_at TIMESTAMPTZ, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await t.test('concurrent approval and rejection have one terminal outcome and one outbox event', async () => {
      const linked = await makeLinkedInvoice(1);
      const outcomes = await Promise.allSettled([
        billing.financeApproveQuotation(linked.invoice.id, randomUUID(), undefined, undefined, 'ADMIN'),
        billing.financeReject(linked.invoice.id, randomUUID(), 'Correct the line items', undefined, 'ADMIN'),
      ]);
      assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
      const invoice = await invoiceRepo.findOneByOrFail({ id: linked.invoice.id });
      assert.ok([InvoiceStatus.FINANCE_APPROVED, InvoiceStatus.FINANCE_REJECTED].includes(invoice.status));
      const audit = await Source.query(`SELECT count(*)::int AS n FROM audit_logs WHERE "entityId"=$1 AND action='STATUS_CHANGE'`, [invoice.id]);
      const outbox = await Source.query(`SELECT payload FROM billing_service_estimate_decision_outbox WHERE invoice_id=$1`, [invoice.id]);
      assert.equal(audit[0].n, 1);
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].payload.invoiceId, invoice.id);
      assert.equal(outbox[0].payload.vendorRevisionId, linked.vendorRevisionId);
      assert.equal(outbox[0].payload.billingRevision, 1);
      assert.equal(outbox[0].payload.decision, invoice.status === InvoiceStatus.FINANCE_APPROVED ? 'APPROVED' : 'REJECTED');
    });

    await t.test('linked validity-extension approval also writes the exact decision outbox atomically', async () => {
      const linked = await makeLinkedInvoice(2);
      const invoice = await billing.financeExtendValidity(linked.invoice.id, { extensionDays: 5, extensionFee: 10 }, randomUUID());
      assert.equal(invoice.status, InvoiceStatus.FINANCE_APPROVED);
      assert.equal(Number(invoice.totalAmount), 110);
      assert.equal(invoice.validityDays, 35);
      const event = await Source.query(`SELECT payload FROM billing_service_estimate_decision_outbox WHERE invoice_id=$1`, [invoice.id]);
      assert.equal(event.length, 1);
      assert.equal(event[0].payload.vendorRevisionId, linked.vendorRevisionId);
      assert.equal(event[0].payload.billingRevision, 2);
      assert.equal(event[0].payload.decision, 'APPROVED');
      assert.ok(event[0].payload.estimateValidUntil);
    });

    await t.test('invoice, audit, and outbox writes roll back at each injected SQL boundary', async () => {
      for (const boundary of ['invoice', 'audit', 'outbox']) {
        const linked = await makeLinkedInvoice(1);
        if (boundary === 'invoice') {
          await Source.query(`CREATE FUNCTION fail_test_invoice_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected invoice failure'; END $$`);
          await Source.query(`CREATE TRIGGER fail_test_invoice_write BEFORE UPDATE ON invoices FOR EACH ROW WHEN (NEW.id='${linked.invoice.id}') EXECUTE FUNCTION fail_test_invoice_write()`);
        } else if (boundary === 'audit') {
          await Source.query(`CREATE FUNCTION fail_test_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$`);
          await Source.query(`CREATE TRIGGER fail_test_audit_write BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW."entityId"='${linked.invoice.id}') EXECUTE FUNCTION fail_test_audit_write()`);
        } else {
          await Source.query(`CREATE FUNCTION fail_test_outbox_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected outbox failure'; END $$`);
          await Source.query(`CREATE TRIGGER fail_test_outbox_write BEFORE INSERT ON billing_service_estimate_decision_outbox FOR EACH ROW WHEN (NEW.invoice_id='${linked.invoice.id}') EXECUTE FUNCTION fail_test_outbox_write()`);
        }
        await assert.rejects(billing.financeReject(linked.invoice.id, randomUUID(), 'Reject for rollback', undefined, 'ADMIN'));
        const invoice = await invoiceRepo.findOneByOrFail({ id: linked.invoice.id });
        assert.equal(invoice.status, InvoiceStatus.WAITING_FINANCE_APPROVAL, `${boundary} failure leaves invoice pending`);
        assert.equal((await Source.query(`SELECT count(*)::int AS n FROM audit_logs WHERE "entityId"=$1 AND action='STATUS_CHANGE'`, [invoice.id]))[0].n, 0);
        assert.equal((await Source.query(`SELECT count(*)::int AS n FROM billing_service_estimate_decision_outbox WHERE invoice_id=$1`, [invoice.id]))[0].n, 0);
        await Source.query(`DROP TRIGGER IF EXISTS fail_test_${boundary}_write ON ${boundary === 'invoice' ? 'invoices' : boundary === 'audit' ? 'audit_logs' : 'billing_service_estimate_decision_outbox'}`);
        await Source.query(`DROP FUNCTION IF EXISTS fail_test_${boundary}_write()`);
      }
    });

    await t.test('dispatcher backs off while RabbitMQ is unavailable, honors leases, and recovers after restart', async () => {
      const linked = await makeLinkedInvoice(1);
      await billing.financeReject(linked.invoice.id, randomUUID(), 'Retry delivery', undefined, 'ADMIN');
      const event = await Source.query(`SELECT event_id FROM billing_service_estimate_decision_outbox WHERE invoice_id=$1`, [linked.invoice.id]);
      const oldRabbitUrl = process.env.RABBITMQ_URL;
      process.env.RABBITMQ_URL = 'amqp://127.0.0.1:1';
      assert.equal(await flushServiceEstimateDecisionOutbox(), 0);
      const failed = await Source.query(`SELECT attempts, delivered_at, lease_until, last_error FROM billing_service_estimate_decision_outbox WHERE event_id=$1`, [event[0].event_id]);
      assert.equal(failed[0].delivered_at, null);
      assert.equal(failed[0].lease_until, null);
      assert.ok(failed[0].attempts >= 1);
      assert.ok(failed[0].last_error);

      process.env.RABBITMQ_URL = oldRabbitUrl || 'amqp://test:test@127.0.0.1:5673';
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      const queue = `handoff-test-${randomUUID()}`;
      try {
        await channel.assertExchange('domain_events', 'topic', { durable: true });
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, 'domain_events', 'billing.service-estimate.finance-decision');
        await Source.query(`UPDATE billing_service_estimate_decision_outbox SET available_at=NOW(), lease_until=NOW()+INTERVAL '1 hour' WHERE event_id=$1`, [event[0].event_id]);
        assert.equal(await flushServiceEstimateDecisionOutbox(), 0, 'a live lease prevents a second dispatcher claim');
        await Source.query(`UPDATE billing_service_estimate_decision_outbox SET lease_until=NOW()-INTERVAL '1 second', available_at=NOW() WHERE event_id=$1`, [event[0].event_id]);
        await Source.query(`ALTER TABLE billing_service_estimate_decision_outbox ADD CONSTRAINT test_fail_delivery_mark CHECK (delivered_at IS NULL)`);
        assert.equal(await flushServiceEstimateDecisionOutbox(), 0, 'publish succeeds but the injected delivered-mark failure leaves the row retryable');
        const unpublishedMark = await Source.query(`SELECT delivered_at FROM billing_service_estimate_decision_outbox WHERE event_id=$1`, [event[0].event_id]);
        assert.equal(unpublishedMark[0].delivered_at, null);
        await Source.query(`ALTER TABLE billing_service_estimate_decision_outbox DROP CONSTRAINT test_fail_delivery_mark`);
        await Source.query(`UPDATE billing_service_estimate_decision_outbox SET lease_until=NOW()-INTERVAL '1 second', available_at=NOW() WHERE event_id=$1`, [event[0].event_id]);
        assert.equal(await flushServiceEstimateDecisionOutbox(), 1, 'a restarted dispatcher republishes after the failed delivered mark');
        const message = await channel.get(queue, { noAck: false });
        assert.ok(message);
        assert.equal(message.properties.messageId, event[0].event_id);
        assert.equal(JSON.parse(message.content.toString()).vendorRevisionId, linked.vendorRevisionId);
        channel.nack(message, false, true); // Vendor/Inventory unavailable: broker retains for redelivery.
        const redelivery = await channel.get(queue, { noAck: false });
        assert.ok(redelivery);
        assert.equal(redelivery.properties.messageId, event[0].event_id);
        assert.equal(await vendorDecisionConsumer.applyBillingServiceEstimateDecision(JSON.parse(redelivery.content.toString())), 'APPLIED');
        assert.equal(await vendorDecisionConsumer.applyBillingServiceEstimateDecision(JSON.parse(redelivery.content.toString())), 'DUPLICATE');
        channel.ack(redelivery);
        const duplicatePublish = await channel.get(queue, { noAck: false });
        assert.ok(duplicatePublish);
        assert.equal(duplicatePublish.properties.messageId, event[0].event_id);
        assert.ok(redelivery.fields.redelivered || duplicatePublish.fields.redelivered);
        assert.equal(await vendorDecisionConsumer.applyBillingServiceEstimateDecision(JSON.parse(duplicatePublish.content.toString())), 'DUPLICATE');
        channel.ack(duplicatePublish); // consumer recovered and deduplicated the second confirmed publish
        assert.equal((await VendorSource.getRepository(ServiceEstimateRevision).findOneByOrFail({ id: linked.vendorRevisionId })).financeDecision, 'REJECTED');
        assert.equal((await VendorSource.getRepository(ServiceTicket).findOneByOrFail({ id: linked.ticketId })).status, ServiceTicketStatus.ESTIMATE_REVISION_REQUIRED);
        assert.equal((await VendorSource.query(`SELECT count(*)::int AS n FROM service_decision_notification_outbox WHERE event_id=$1`, [event[0].event_id]))[0].n, 1);
        const sent = await Source.query(`SELECT delivered_at FROM billing_service_estimate_decision_outbox WHERE event_id=$1`, [event[0].event_id]);
        assert.ok(sent[0].delivered_at);
      } finally {
        await channel.deleteQueue(queue).catch(() => undefined);
        await channel.close().catch(() => undefined);
        await connection.close();
        process.env.RABBITMQ_URL = oldRabbitUrl;
      }
    });
  } finally {
    NotificationPublisher.publishInAppRequest = publishNotification;
    await closeRabbitConnection();
    if (VendorSource.isInitialized) await VendorSource.destroy();
    if (Source.isInitialized) await Source.destroy();
  }
});
