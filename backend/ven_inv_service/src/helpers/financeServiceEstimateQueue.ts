import { ServiceEstimateStatus } from '../entities/serviceEstimateEntity';
import { ServiceTicketStatus } from '../entities/serviceTicketEntity';

type TicketScope = {
  id: string;
  branchId?: string | null;
  status?: string;
  serviceQuotationId?: string | null;
};

type EstimateCandidate = {
  id: string;
  ticketId: string;
  version: number;
  created_at: Date | string;
  status: string;
  totalCost: number | string;
  ticket: TicketScope;
};

type RevisionCandidate = {
  id: string;
  ticketId: string;
  version: number;
  revisionNumber: number;
  submittedAt: Date | string;
  status: string;
  financeDecision: string | null;
  invoiceId: string | null;
  ticket: TicketScope | null;
};

function newestByTicket<T extends { ticketId: string }>(records: T[]): T[] {
  const latest = new Map<string, T>();
  for (const record of records) {
    if (!latest.has(record.ticketId)) latest.set(record.ticketId, record);
  }
  return [...latest.values()];
}

/** Defensive final filter for the source-owned Finance queue; does not create Billing data. */
export function selectPendingServiceEstimateQueue<
  T extends EstimateCandidate,
  R extends RevisionCandidate,
>(
  estimates: T[],
  revisions: R[],
  scope: { role?: string; branchId?: string | null },
): { estimates: T[]; revisions: R[] } {
  const branchAllowed = (ticket: TicketScope) =>
    scope.role === 'ADMIN' || !scope.branchId || ticket.branchId === scope.branchId;

  const pendingEstimates = estimates
    .filter(
      (estimate) =>
        estimate.status === ServiceEstimateStatus.WAITING_FINANCE_APPROVAL &&
        !estimate.ticket.serviceQuotationId &&
        branchAllowed(estimate.ticket),
    )
    .sort((a, b) => {
      const versionDiff = b.version - a.version;
      return versionDiff || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pendingRevisions = revisions
    .filter(
      (revision) =>
        !!revision.ticket &&
        revision.status === 'WAITING_ADDITIONAL_APPROVAL' &&
        !revision.financeDecision &&
        !revision.invoiceId &&
        revision.ticket.status === ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2 &&
        branchAllowed(revision.ticket),
    )
    .sort((a, b) => {
      const versionDiff = b.version - a.version;
      const revisionDiff = b.revisionNumber - a.revisionNumber;
      return (
        versionDiff ||
        revisionDiff ||
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    });

  return {
    estimates: newestByTicket(pendingEstimates),
    revisions: newestByTicket(pendingRevisions),
  };
}
