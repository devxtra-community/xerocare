/* eslint-disable @typescript-eslint/no-explicit-any -- Test doubles model the broad AMQP runtime interfaces. */
import assert from 'node:assert/strict';
import {
  validateBillingDecisionTarget,
  BillingServiceEstimateDecisionEvent,
} from '../src/helpers/billingServiceEstimateDecision';
import { EventEmitter } from 'node:events';
import { consumeBillingServiceEstimateDecision } from '../src/events/consumers/billingServiceEstimateDecisionConsumer';

const event: BillingServiceEstimateDecisionEvent = {
  eventId: 'evt-1',
  eventType: 'billing.service-estimate.finance-decision.v1',
  occurredAt: '2026-10-12T10:00:00Z',
  invoiceId: 'inv-1',
  serviceTicketId: 'ticket-1',
  vendorRevisionId: 'rev-2',
  billingRevision: 2,
  decision: 'REJECTED',
  decidedBy: 'finance-1',
  decidedAt: '2026-10-12T10:00:00Z',
  reason: 'Fix quantity',
  invoiceStatus: 'FINANCE_REJECTED',
  estimateValidUntil: null,
};
const revision = {
  id: 'rev-2',
  invoiceId: 'inv-1',
  billingRevision: 2,
  ticketId: 'ticket-1',
  financeDecision: null,
};

assert.equal(validateBillingDecisionTarget(event, revision, 'ticket-1'), null);
assert.equal(
  validateBillingDecisionTarget({ ...event, vendorRevisionId: 'rev-1' }, revision, 'ticket-1'),
  'Revision ID mismatch',
);
assert.equal(
  validateBillingDecisionTarget({ ...event, billingRevision: 1 }, revision, 'ticket-1'),
  'Billing revision mismatch',
);
assert.equal(
  validateBillingDecisionTarget({ ...event, invoiceId: 'inv-other' }, revision, 'ticket-1'),
  'Invoice ID mismatch',
);
assert.equal(
  validateBillingDecisionTarget(event, { ...revision, financeDecision: 'REJECTED' }, 'ticket-1'),
  'DUPLICATE_DECISION',
);
assert.equal(
  validateBillingDecisionTarget(
    { ...event, decision: 'APPROVED' },
    { ...revision, financeDecision: 'REJECTED' },
    'ticket-1',
  ),
  'Conflicting terminal decision',
);

console.log('Billing service-estimate decision contract tests passed');

class FakeConfirmChannel extends EventEmitter {
  acked = 0;
  nacked = 0;
  published: Array<{ queue: string; content: Buffer; options: any }> = [];
  publish(
    _exchange: string,
    queue: string,
    content: Buffer,
    options: any,
    callback: (error?: Error | null) => void,
  ) {
    this.published.push({ queue, content, options });
    callback(null);
    return true;
  }
  ack() {
    this.acked += 1;
  }
  nack() {
    this.nacked += 1;
  }
}

function message(body: string, headers: Record<string, unknown> = {}, messageId = 'evt-1') {
  return {
    content: Buffer.from(body),
    properties: { headers, messageId, contentType: 'application/json' },
  } as any;
}

async function verifyPoisonMessageRouting() {
  const channel = new FakeConfirmChannel();
  let calls = 0;
  await consumeBillingServiceEstimateDecision(
    message(JSON.stringify(event)),
    channel as any,
    async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary database outage');
      return 'APPLIED';
    },
  );
  assert.equal(channel.published.length, 1);
  assert.match(channel.published[0].queue, /\.retry$/);
  assert.equal(channel.published[0].options.headers['x-service-estimate-retry-count'], 1);
  assert.equal(channel.published[0].options.messageId, 'evt-1');
  assert.equal(channel.acked, 1);
  const retryMsg = message(
    channel.published[0].content.toString(),
    channel.published[0].options.headers,
  );
  await consumeBillingServiceEstimateDecision(retryMsg, channel as any, async () => 'APPLIED');
  assert.equal(channel.acked, 2);

  const malformed = message('{not-json', {}, 'poison-1');
  for (let retry = 0; retry <= 3; retry += 1) {
    await consumeBillingServiceEstimateDecision(
      {
        ...malformed,
        properties: {
          ...malformed.properties,
          headers: retry ? { 'x-service-estimate-retry-count': retry } : {},
        },
      } as any,
      channel as any,
    );
  }
  const dead = channel.published.find((published) => published.queue.endsWith('.dead'));
  assert.ok(dead, 'malformed message must reach durable DLQ after bounded retries');
  assert.equal(dead.content.toString(), '{not-json');
  assert.equal(dead.options.messageId, 'poison-1');
  assert.match(dead.options.headers['x-dead-letter-reason'], /JSON/);
  assert.equal(channel.nacked, 0);
}

void verifyPoisonMessageRouting().then(() =>
  console.log('Billing decision bounded retry and DLQ tests passed'),
);
