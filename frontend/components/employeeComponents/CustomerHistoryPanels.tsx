'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Loader2 } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { Modal } from '@/components/ui/Modal';
import type { ServiceTicket, ServiceEstimate } from '@/lib/serviceTicket';
import { getTicketEstimates } from '@/lib/serviceTicket';
import type { HistoryInvoice } from '@/lib/machineAllocations';

const PAGE_SIZE = 5;

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'FREE_SERVICE':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'ASSIGNED':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'DIAGNOSED':
      return 'bg-lease/10 text-lease border-lease/30';
    case 'WAITING_FINANCE_APPROVAL':
    case 'WAITING_FINANCE_APPROVAL_2':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'ADDITIONAL_ESTIMATE_PENDING':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'ESTIMATE_RECORDED':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'FINANCE_APPROVED':
    case 'FINANCE_APPROVED_2':
      return 'bg-success/10 text-success border-success/30';
    case 'QUOTED':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'FINANCE_REJECTED':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'CUSTOMER_APPROVED':
      return 'bg-success/10 text-success border-success/30';
    case 'CUSTOMER_REJECTED':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'IN_PROGRESS':
      return 'bg-info/10 text-info border-info/30';
    case 'COMPLETED':
      return 'bg-success/10 text-success border-success/30';
    case 'CANCELLED':
      return 'bg-muted text-foreground border-border';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

export function ServiceTicketHistoryPanel({ tickets }: { tickets?: ServiceTicket[] }) {
  const [page, setPage] = useState(1);
  const list = tickets || [];

  useEffect(() => {
    setPage(1);
  }, [tickets]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Briefcase size={14} className="text-primary" /> Service Ticket History
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted p-4 rounded-xl border border-border">
          No service tickets logged for this customer.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((t) => (
              <div key={t.id} className="bg-muted p-4 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{t.ticketNumber}</span>
                  <Badge
                    className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(t.status)}`}
                  >
                    {t.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground font-bold">
                  {t.productName || t.productModel} (Model)
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {t.issueDescription}
                </p>
                {t.completionNotes && (
                  <div className="bg-card p-2 rounded border border-border text-[10px] text-muted-foreground font-medium">
                    <span className="font-bold text-foreground">Completion:</span>{' '}
                    {t.completionNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
          {list.length > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={list.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

interface FlatInvoice {
  billType: string;
  invoice: HistoryInvoice;
}

function flattenBillingHistory(billingHistory?: Record<string, unknown[]> | null): FlatInvoice[] {
  if (!billingHistory) return [];
  const flat: FlatInvoice[] = [];
  Object.entries(billingHistory).forEach(([billType, invoices]) => {
    invoices.forEach((invObj) => {
      flat.push({ billType, invoice: invObj as HistoryInvoice });
    });
  });
  return flat.sort((a, b) => {
    const at = a.invoice.createdAt ? new Date(a.invoice.createdAt).getTime() : 0;
    const bt = b.invoice.createdAt ? new Date(b.invoice.createdAt).getTime() : 0;
    return bt - at;
  });
}

export function BillingHistoryPanel({
  billingHistory,
  tickets,
}: {
  billingHistory?: Record<string, unknown[]> | null;
  tickets?: ServiceTicket[];
}) {
  const [page, setPage] = useState(1);
  const flat = flattenBillingHistory(billingHistory);

  useEffect(() => {
    setPage(1);
  }, [billingHistory]);

  const totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
  const paged = flat.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [selected, setSelected] = useState<FlatInvoice | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<
    { ticket: ServiceTicket; estimates: ServiceEstimate[] }[]
  >([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const openInvoice = async (item: FlatInvoice) => {
    setSelected(item);
    setLoadingRelated(true);
    const matched = (tickets || []).filter((t) => t.serviceQuotationId === item.invoice.id);
    try {
      const withEstimates = await Promise.all(
        matched.map(async (ticket) => {
          const res = await getTicketEstimates(ticket.id).catch(() => ({
            estimates: [] as ServiceEstimate[],
            revisions: [],
          }));
          return { ticket, estimates: res.estimates };
        }),
      );
      setRelatedTickets(withEstimates);
    } finally {
      setLoadingRelated(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <DollarSign size={14} className="text-success" /> Contract & Invoice History
      </h3>
      {flat.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted p-4 rounded-xl border border-border">
          No billing history / contracts found.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {paged.map(({ billType, invoice }) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => openInvoice({ billType, invoice })}
                className="w-full text-left bg-muted p-3 rounded-lg border border-border flex items-center justify-between text-xs hover:border-primary/30 hover:bg-primary/10 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{invoice.invoiceNumber}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-foreground">
                      {billType}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Total: ${Number(invoice.totalAmount || 0).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase border-border text-foreground bg-card shadow-none"
                >
                  {invoice.status}
                </Badge>
              </button>
            ))}
          </div>
          {flat.length > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={flat.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="lg"
        title="Invoice Details"
      >
        {selected && (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 border border-border grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                  Invoice Number
                </span>
                <span className="font-bold text-foreground">{selected.invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                  Type
                </span>
                <span className="font-bold text-foreground">{selected.billType}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                  Total
                </span>
                <span className="font-bold text-foreground">
                  ${Number(selected.invoice.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                  Status
                </span>
                <Badge variant="outline" className="text-[9px] font-bold uppercase">
                  {selected.invoice.status}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                Linked Service Tickets
              </h4>
              {loadingRelated ? (
                <div className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </div>
              ) : relatedTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg border border-border">
                  No linked service ticket found for this invoice.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatedTickets.map(({ ticket, estimates }) => (
                    <div
                      key={ticket.id}
                      className="bg-muted p-3 rounded-xl border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">
                          {ticket.ticketNumber}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-foreground">{ticket.issueDescription}</p>
                      {estimates.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border">
                          {estimates.map((est) => (
                            <div
                              key={est.id}
                              className="flex items-center justify-between text-[10px]"
                            >
                              <span className="text-muted-foreground">
                                Estimate v{est.version} — Labour $
                                {Number(est.labourCost).toLocaleString()}, Total $
                                {Number(est.totalCost).toLocaleString()}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-bold uppercase">
                                {est.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
