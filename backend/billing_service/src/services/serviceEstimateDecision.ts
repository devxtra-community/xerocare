import { randomUUID } from 'crypto';

export type ServiceEstimateFinanceDecision = 'APPROVED' | 'REJECTED';

export interface ServiceEstimateDecisionEvent {
  eventId: string;
  eventType: 'billing.service-estimate.finance-decision.v1';
  occurredAt: string;
  invoiceId: string;
  serviceTicketId: string;
  vendorRevisionId: string;
  billingRevision: number;
  decision: ServiceEstimateFinanceDecision;
  decidedBy: string;
  decidedAt: string;
  reason: string | null;
  invoiceStatus: 'FINANCE_APPROVED' | 'FINANCE_REJECTED';
  estimateValidUntil: string | null;
}

export function createServiceEstimateDecisionEvent(
  input: Omit<ServiceEstimateDecisionEvent, 'eventId' | 'eventType' | 'occurredAt'>,
): ServiceEstimateDecisionEvent {
  const occurredAt = input.decidedAt;
  return {
    ...input,
    eventId: randomUUID(),
    eventType: 'billing.service-estimate.finance-decision.v1',
    occurredAt,
  };
}

export function canDecideServiceQuotation(status: string): boolean {
  return status === 'WAITING_FINANCE_APPROVAL' || status === 'EMPLOYEE_APPROVED';
}

export function serviceDecisionRetryDelay(attempt: number): number {
  return Math.min(300_000, 1000 * 2 ** Math.max(0, attempt - 1));
}
