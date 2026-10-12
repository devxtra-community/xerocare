import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Source } from '../src/config/db';
import { createRabbitChannel, closeRabbitConnection } from '../src/config/rabbitmq';
import { publishConfirmed } from '../src/utils/publishConfirmed';
import { startBillingServiceEstimateDecisionConsumer } from '../src/events/consumers/billingServiceEstimateDecisionConsumer';
import {
  ServiceTicket,
  ServiceContext,
  JobType,
  ServiceTicketStatus,
} from '../src/entities/serviceTicketEntity';
import { ServiceEstimateRevision } from '../src/entities/serviceEstimateRevisionEntity';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'billing.service-estimate.finance-decision';
const QUEUE = 'veninv.billing.service-estimate-decisions';
const RETRY_QUEUE = `${QUEUE}.retry`;
const DEAD_QUEUE = `${QUEUE}.dead`;

async function waitFor<T>(
  getValue: () => Promise<T | null>,
  label: string,
  timeoutMs = 10000,
): Promise<T> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const value = await getValue();
    if (value) return value;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  const databaseUrl = process.env.XEROCARE_SERVICE_DECISION_RABBIT_TEST_DATABASE_URL;
  assert.ok(
    databaseUrl,
    'Set XEROCARE_SERVICE_DECISION_RABBIT_TEST_DATABASE_URL to xerocare_consumer_test',
  );
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname));
  assert.equal(parsed.port, '55432');
  assert.equal(parsed.pathname, '/xerocare_consumer_test');
  assert.equal(parsed.password, '');
  assert.ok(
    process.env.RABBITMQ_URL?.includes('127.0.0.1:5673'),
    'RABBITMQ_URL must target the disposable broker',
  );

  Source.setOptions({ url: databaseUrl, ssl: false, synchronize: true, dropSchema: true });
  await Source.initialize();
  await Source.query(`CREATE TABLE billing_decision_inbox (
    event_id UUID PRIMARY KEY, invoice_id UUID NOT NULL, service_ticket_id UUID NOT NULL,
    vendor_revision_id UUID NOT NULL, billing_revision INTEGER NOT NULL,
    outcome VARCHAR(24) NOT NULL, error TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ
  )`);
  await Source.query(`CREATE TABLE service_decision_notification_outbox (
    event_id UUID PRIMARY KEY, recipient_ids JSONB NOT NULL, payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_until TIMESTAMPTZ, delivered_at TIMESTAMPTZ, last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const ticket = await Source.getRepository(ServiceTicket).save(
    Source.getRepository(ServiceTicket).create({
      ticketNumber: `RMQ-${randomUUID()}`,
      productBrand: 'Test',
      productModel: 'Test',
      productName: 'Test',
      serialNumber: randomUUID(),
      serviceContext: ServiceContext.CHARGEABLE,
      issueDescription: 'Rabbit retry integration',
      jobType: JobType.ONSITE,
      status: ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
      createdBy: randomUUID(),
      assignedTechnicianId: randomUUID(),
      branchId: randomUUID(),
      track: 'B',
    }),
  );
  const invoiceId = randomUUID();
  ticket.serviceQuotationId = invoiceId;
  await Source.getRepository(ServiceTicket).save(ticket);

  const makeDecision = async (billingRevision: number) => {
    const revision = await Source.getRepository(ServiceEstimateRevision).save(
      Source.getRepository(ServiceEstimateRevision).create({
        invoiceId,
        billingRevision,
        submissionCorrelationId: randomUUID(),
        ticketId: ticket.id,
        version: billingRevision,
        revisionNumber: billingRevision,
        status: 'WAITING_ADDITIONAL_APPROVAL',
        itemsSnapshot: [],
        labourCost: 0,
        totalCost: 0,
        totalAmount: 0,
        discountApplied: 0,
        visitChargeAmount: 0,
      }),
    );
    const event = {
      eventId: randomUUID(),
      eventType: 'billing.service-estimate.finance-decision.v1',
      occurredAt: new Date().toISOString(),
      invoiceId,
      serviceTicketId: ticket.id,
      vendorRevisionId: revision.id,
      billingRevision,
      decision: 'REJECTED',
      decidedBy: randomUUID(),
      decidedAt: new Date().toISOString(),
      reason: 'Integration rejection',
      invoiceStatus: 'FINANCE_REJECTED',
      estimateValidUntil: null,
    };
    return { event, raw: Buffer.from(JSON.stringify(event)) };
  };

  const publishChannel = await createRabbitChannel();
  const observerChannel = await createRabbitChannel();
  let activeConsumer: Awaited<
    ReturnType<typeof startBillingServiceEstimateDecisionConsumer>
  > | null = null;
  try {
    // This broker is a disposable integration instance; clear only the three
    // service-decision fixture queues so failed prior test runs cannot interfere.
    await publishChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await publishChannel.assertQueue(QUEUE, { durable: true });
    await publishChannel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGE, 'x-dead-letter-routing-key': ROUTING_KEY },
    });
    await publishChannel.assertQueue(DEAD_QUEUE, { durable: true });
    await publishChannel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
    await publishChannel.purgeQueue(QUEUE);
    await publishChannel.purgeQueue(RETRY_QUEUE);
    await publishChannel.purgeQueue(DEAD_QUEUE);
    activeConsumer = await startBillingServiceEstimateDecisionConsumer();
    // Cause exactly one transactional inbox failure; PostgreSQL sequence increments
    // survive rollback, so the retry succeeds after the first injected error.
    const transient = await makeDecision(2);
    await Source.query(`CREATE SEQUENCE IF NOT EXISTS test_decision_failure_seq`);
    await Source.query(`ALTER SEQUENCE test_decision_failure_seq RESTART WITH 1`);
    await Source.query(`CREATE OR REPLACE FUNCTION test_fail_first_decision() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.event_id='${transient.event.eventId}'::uuid AND nextval('test_decision_failure_seq')=1 THEN
          RAISE EXCEPTION 'injected transient inbox failure';
        END IF;
        RETURN NEW;
      END $$`);
    await Source.query(`CREATE TRIGGER test_fail_first_decision BEFORE INSERT ON billing_decision_inbox
      FOR EACH ROW EXECUTE FUNCTION test_fail_first_decision()`);
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, transient.raw, {
      messageId: transient.event.eventId,
      contentType: 'application/json',
    });
    const transientRow = await waitFor(async () => {
      const rows = await Source.query(
        `SELECT outcome FROM billing_decision_inbox WHERE event_id=$1`,
        [transient.event.eventId],
      );
      return rows[0]?.outcome === 'APPLIED' ? rows[0] : null;
    }, 'transient event recovery');
    assert.equal(transientRow.outcome, 'APPLIED');
    assert.equal(
      (await Source.query(`SELECT last_value FROM test_decision_failure_seq`))[0].last_value,
      '2',
    );
    console.log('Rabbit transient retry recovered');

    await activeConsumer!.close();
    const restartedConsumer = await startBillingServiceEstimateDecisionConsumer();
    activeConsumer = restartedConsumer;
    const replayed = await makeDecision(3);
    // Apply once through the actual queue, then replay the same event through the
    // inbox path after consumer restart; state/activity/notification intent stay once.
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, replayed.raw, {
      messageId: replayed.event.eventId,
      contentType: 'application/json',
    });
    await waitFor(async () => {
      const rows = await Source.query(
        `SELECT outcome FROM billing_decision_inbox WHERE event_id=$1`,
        [replayed.event.eventId],
      );
      return rows[0]?.outcome === 'APPLIED' ? rows[0] : null;
    }, 'valid post-restart decision');
    console.log('Rabbit valid decision processed after consumer restart');
    const activityCount = async () =>
      Number(
        (
          await Source.query(
            `SELECT count(*)::int AS count FROM service_ticket_activities WHERE "ticketId"=$1`,
            [ticket.id],
          )
        )[0].count,
      );
    const notificationIntentCount = async () =>
      Number(
        (
          await Source.query(
            `SELECT count(*)::int AS count FROM service_decision_notification_outbox WHERE event_id=$1`,
            [replayed.event.eventId],
          )
        )[0].count,
      );
    const activityAfterApply = await activityCount();
    const intentsAfterApply = await notificationIntentCount();
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, replayed.raw, {
      messageId: replayed.event.eventId,
      contentType: 'application/json',
    });
    await delay(500);
    assert.equal(
      (
        await Source.query(
          `SELECT count(*)::int AS count FROM billing_decision_inbox WHERE event_id=$1`,
          [replayed.event.eventId],
        )
      )[0].count,
      1,
    );
    assert.equal(await activityCount(), activityAfterApply);
    assert.equal(await notificationIntentCount(), intentsAfterApply);

    // Exercise safe DLQ replay: place the already-applied original event in the DLQ,
    // re-publish the exact body/message ID to the business route, then ack the DLQ copy.
    await publishConfirmed(publishChannel, '', DEAD_QUEUE, replayed.raw, {
      messageId: replayed.event.eventId,
      contentType: 'application/json',
      persistent: true,
    });
    const deadReplay = await waitFor(
      async () => observerChannel.get(DEAD_QUEUE, false),
      'DLQ replay fixture',
    );
    console.log('Rabbit DLQ replay fixture received');
    assert.equal(deadReplay.properties.messageId, replayed.event.eventId);
    assert.deepEqual(deadReplay.content, replayed.raw);
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, deadReplay.content, {
      messageId: deadReplay.properties.messageId,
      contentType: deadReplay.properties.contentType,
    });
    observerChannel.ack(deadReplay);
    await delay(500);
    assert.equal(await activityCount(), activityAfterApply);
    assert.equal(await notificationIntentCount(), intentsAfterApply);
    console.log('Rabbit replay deduplicated by inbox');

    // Exhaust all 3 bounded retries (initial processing plus 3 retries) for malformed bytes.
    const poisonBytes = Buffer.from('{malformed decision');
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, poisonBytes, {
      messageId: 'poison-rabbit-integration',
      contentType: 'application/json',
    });
    const exhausted = await waitFor(
      async () => {
        const message = await observerChannel.get(DEAD_QUEUE, false);
        if (!message) return null;
        if (message.properties.messageId !== 'poison-rabbit-integration') {
          observerChannel.nack(message, false, true);
          return null;
        }
        return message;
      },
      'exhausted poison message in DLQ',
      40000,
    );
    assert.deepEqual(exhausted.content, poisonBytes);
    assert.equal(exhausted.properties.headers?.['x-service-estimate-retry-count'], 3);
    assert.match(String(exhausted.properties.headers?.['x-dead-letter-reason']), /JSON/);
    observerChannel.ack(exhausted);

    const afterPoison = await makeDecision(4);
    await publishConfirmed(publishChannel, EXCHANGE, ROUTING_KEY, afterPoison.raw, {
      messageId: afterPoison.event.eventId,
      contentType: 'application/json',
    });
    await waitFor(async () => {
      const rows = await Source.query(
        `SELECT outcome FROM billing_decision_inbox WHERE event_id=$1`,
        [afterPoison.event.eventId],
      );
      return rows[0]?.outcome === 'APPLIED' ? rows[0] : null;
    }, 'valid event after poison message');
    console.log(
      'Rabbit consumer integration passed: transient retry, restart, inbox replay deduplication, bounded poison DLQ, and subsequent valid event',
    );
  } finally {
    if (publishChannel) await publishChannel.close().catch(() => undefined);
    if (observerChannel) await observerChannel.close().catch(() => undefined);
    if (activeConsumer) await activeConsumer.close().catch(() => undefined);
    await closeRabbitConnection().catch(() => undefined);
    if (Source.isInitialized) await Source.destroy();
  }
}

main().catch((error) => {
  console.error(
    'Rabbit consumer integration failed:',
    error,
    error instanceof Error ? error.stack : typeof error,
  );
  process.exitCode = 1;
});
