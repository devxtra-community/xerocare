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
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'FREE_SERVICE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ASSIGNED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'DIAGNOSED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'WAITING_FINANCE_APPROVAL':
    case 'WAITING_FINANCE_APPROVAL_2':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ADDITIONAL_ESTIMATE_PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'ESTIMATE_RECORDED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'FINANCE_APPROVED':
    case 'FINANCE_APPROVED_2':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'QUOTED':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'FINANCE_REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CUSTOMER_APPROVED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'CUSTOMER_REJECTED':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'IN_PROGRESS':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Briefcase size={14} className="text-blue-500" /> Service Ticket History
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
          No service tickets logged for this customer.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((t) => (
              <div
                key={t.id}
                className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {t.ticketNumber}
                  </span>
                  <Badge
                    className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(t.status)}`}
                  >
                    {t.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-700 font-bold">
                  {t.productName || t.productModel} (Model)
                </p>
                <p className="text-[11px] text-slate-500 font-medium">{t.issueDescription}</p>
                {t.completionNotes && (
                  <div className="bg-white p-2 rounded border border-slate-100 text-[10px] text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">Completion:</span>{' '}
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
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <DollarSign size={14} className="text-emerald-500" /> Contract & Invoice History
      </h3>
      {flat.length === 0 ? (
        <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                className="w-full text-left bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{invoice.invoiceNumber}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-600">
                      {billType}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Total: ${Number(invoice.totalAmount || 0).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase border-slate-200 text-slate-600 bg-white shadow-none"
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
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  Invoice Number
                </span>
                <span className="font-bold text-slate-700">{selected.invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Type</span>
                <span className="font-bold text-slate-700">{selected.billType}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Total</span>
                <span className="font-bold text-slate-700">
                  ${Number(selected.invoice.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Status</span>
                <Badge variant="outline" className="text-[9px] font-bold uppercase">
                  {selected.invoice.status}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                Linked Service Tickets
              </h4>
              {loadingRelated ? (
                <div className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </div>
              ) : relatedTickets.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  No linked service ticket found for this invoice.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatedTickets.map(({ ticket, estimates }) => (
                    <div
                      key={ticket.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600">
                          {ticket.ticketNumber}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600">{ticket.issueDescription}</p>
                      {estimates.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-200">
                          {estimates.map((est) => (
                            <div
                              key={est.id}
                              className="flex items-center justify-between text-[10px]"
                            >
                              <span className="text-slate-500">
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
