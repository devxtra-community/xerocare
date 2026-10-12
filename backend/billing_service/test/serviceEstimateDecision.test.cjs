const test = require('node:test');
const assert = require('node:assert/strict');
const { canDecideServiceQuotation, serviceDecisionRetryDelay, createServiceEstimateDecisionEvent } = require('../src/services/serviceEstimateDecision');

test('Finance decisions accept only pending quotation states', () => {
  assert.equal(canDecideServiceQuotation('WAITING_FINANCE_APPROVAL'), true);
  assert.equal(canDecideServiceQuotation('EMPLOYEE_APPROVED'), true);
  assert.equal(canDecideServiceQuotation('FINANCE_APPROVED'), false);
  assert.equal(canDecideServiceQuotation('FINANCE_REJECTED'), false);
});

test('decision event carries stable exact-revision association and unique identity', () => {
  const input = {
    invoiceId: 'invoice', serviceTicketId: 'ticket', vendorRevisionId: 'revision', billingRevision: 4,
    decision: 'REJECTED', decidedBy: 'finance-user', decidedAt: '2026-10-12T10:00:00.000Z',
    reason: 'Correct the part quantity', invoiceStatus: 'FINANCE_REJECTED', estimateValidUntil: null,
  };
  const first = createServiceEstimateDecisionEvent(input);
  const second = createServiceEstimateDecisionEvent(input);
  assert.equal(first.eventType, 'billing.service-estimate.finance-decision.v1');
  assert.notEqual(first.eventId, second.eventId);
  assert.equal(first.vendorRevisionId, input.vendorRevisionId);
  assert.equal(first.billingRevision, input.billingRevision);
  assert.equal(first.reason, input.reason);
});

test('outbox retry delay backs off and caps', () => {
  assert.equal(serviceDecisionRetryDelay(1), 1000);
  assert.equal(serviceDecisionRetryDelay(3), 4000);
  assert.equal(serviceDecisionRetryDelay(20), 300000);
});
