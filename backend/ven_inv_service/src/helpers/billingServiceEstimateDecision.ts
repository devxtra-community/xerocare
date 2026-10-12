export interface BillingServiceEstimateDecisionEvent {
  eventId: string;
  eventType: 'billing.service-estimate.finance-decision.v1';
  occurredAt: string;
  invoiceId: string;
  serviceTicketId: string;
  vendorRevisionId: string;
  billingRevision: number;
  decision: 'APPROVED' | 'REJECTED';
  decidedBy: string;
  decidedAt: string;
  reason: string | null;
  invoiceStatus: 'FINANCE_APPROVED' | 'FINANCE_REJECTED';
  estimateValidUntil: string | null;
}

export function validateBillingDecisionTarget(
  event: BillingServiceEstimateDecisionEvent,
  revision: {
    id: string;
    invoiceId: string | null;
    billingRevision: number | null;
    ticketId: string;
    financeDecision: string | null;
  },
  ticketId: string,
): string | null {
  if (event.eventType !== 'billing.service-estimate.finance-decision.v1')
    return 'Unsupported decision event type';
  if (event.vendorRevisionId !== revision.id) return 'Revision ID mismatch';
  if (event.invoiceId !== revision.invoiceId) return 'Invoice ID mismatch';
  if (event.serviceTicketId !== revision.ticketId || event.serviceTicketId !== ticketId)
    return 'Ticket ID mismatch';
  if (revision.billingRevision !== event.billingRevision) return 'Billing revision mismatch';
  if (revision.financeDecision) {
    return revision.financeDecision === event.decision
      ? 'DUPLICATE_DECISION'
      : 'Conflicting terminal decision';
  }
  return null;
}
