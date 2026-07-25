'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Wrench, ArrowRightLeft, Receipt, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { getServiceTicketById, type ServiceTicket } from '@/lib/serviceTicket';

// The backend entity has diagnosisCompletedAt (confirmed via the real API
// response) but the shared ServiceTicket type doesn't declare it yet.
type ServiceTicketDetail = ServiceTicket & { diagnosisCompletedAt?: string };
import { getStockTransfer, STATUS_LABELS as TRANSFER_STATUS_LABELS } from '@/lib/stockTransfer';
import type { ActivityEvent } from '@/lib/finance/accountsApi';
import { ModalShell, DetailField, SectionHeading } from './ReceivablePayableDetail';

// ─── Purchase — new, minimal, read-only. Fetches the same `purchases` record
// already used by the manager-only purchase detail page, via the existing
// unrestricted GET /purchases/:id endpoint (no role gate beyond auth). ───────
export function PurchaseDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['branch-activity-purchase', id],
    queryFn: async () => {
      const { purchaseService } = await import('@/services/purchaseService');
      return purchaseService.getPurchaseById(id);
    },
  });

  return (
    <ModalShell
      title={data ? `Purchase — ${data.vendor?.name ?? 'Unknown Vendor'}` : 'Purchase Detail'}
      subtitle={
        data?.purchaseOrigin
          ? `${data.purchaseOrigin}${data.purchaseCategory ? ` · ${data.purchaseCategory}` : ''}`
          : undefined
      }
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <SectionHeading icon={Truck}>Purchase</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
            <DetailField label="Vendor" value={data.vendor?.name} />
            <DetailField label="Vendor Country" value={data.vendorCountry} />
            <DetailField label="Origin" value={data.purchaseOrigin} />
            <DetailField label="Category" value={data.purchaseCategory ?? undefined} />
            <DetailField label="Created" value={data.createdAt?.slice(0, 10)} />
            <DetailField label="Status" value={data.status} />
            <DetailField
              label="Purchase Amount"
              value={formatCurrency(data.purchaseAmount, data.currencyCode ?? undefined)}
            />
            <DetailField
              label="Total Amount"
              value={formatCurrency(data.totalAmount, data.currencyCode ?? undefined)}
            />
            <DetailField
              label="Paid"
              value={formatCurrency(data.paidAmount, data.currencyCode ?? undefined)}
            />
            <DetailField
              label="Remaining"
              value={formatCurrency(data.remainingAmount, data.currencyCode ?? undefined)}
            />
            {data.customsDuty != null && (
              <DetailField
                label="Customs Duty"
                value={formatCurrency(data.customsDuty, data.currencyCode ?? undefined)}
              />
            )}
            {data.importInvoiceNo && (
              <DetailField label="Import Invoice #" value={data.importInvoiceNo} />
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Service Ticket — new, minimal, read-only. No routed detail page exists
// anywhere in this app (ticket detail is a client-side modal inside a large
// service-module page) — fetches the same record via the existing
// GET /service/tickets/:id endpoint (unrestricted beyond auth + the
// technician-assignment scoping that doesn't apply to Finance/Admin). ───────
export function ServiceTicketDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['branch-activity-ticket', id],
    queryFn: () => getServiceTicketById(id) as Promise<ServiceTicketDetail>,
  });

  return (
    <ModalShell
      title={data ? `Service Ticket ${data.ticketNumber}` : 'Service Ticket'}
      subtitle={
        data
          ? `${data.productBrand ?? ''} ${data.productModel ?? data.productName ?? ''}`.trim()
          : undefined
      }
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <SectionHeading icon={Wrench}>Ticket</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
            <DetailField label="Ticket #" value={data.ticketNumber} />
            <DetailField label="Status" value={data.status.replace(/_/g, ' ')} />
            <DetailField label="Job Type" value={data.jobType} />
            <DetailField
              label="Product"
              value={
                [data.productBrand, data.productModel ?? data.productName]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
            <DetailField label="Serial #" value={data.serialNumber} />
            <DetailField label="Opened" value={data.created_at?.slice(0, 10)} />
            {data.diagnosisCompletedAt && (
              <DetailField label="Diagnosed" value={data.diagnosisCompletedAt.slice(0, 10)} />
            )}
            {data.completedAt && (
              <DetailField label="Completed" value={data.completedAt.slice(0, 10)} />
            )}
            <div className="col-span-full">
              <DetailField label="Issue Description" value={data.issueDescription} />
            </div>
            {data.diagnosisNotes && (
              <div className="col-span-full">
                <DetailField label="Diagnosis Notes" value={data.diagnosisNotes} />
              </div>
            )}
            {data.completionNotes && (
              <div className="col-span-full">
                <DetailField label="Completion Notes" value={data.completionNotes} />
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Stock Transfer — new, minimal, read-only. Reuses the same
// GET /stock-transfers/:id record consumed by the full interactive
// TransferDetail component, but presented as a plain summary here rather
// than embedding TransferDetail's own approve/reject/dispatch mutations
// (which are Manager/Admin actions, not something Finance should trigger
// from a "what happened today" feed). ────────────────────────────────────
export function StockTransferDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['branch-activity-transfer', id],
    queryFn: () => getStockTransfer(id),
  });

  return (
    <ModalShell
      title={data ? `Stock Transfer ${data.transfer_number}` : 'Stock Transfer'}
      subtitle={data ? TRANSFER_STATUS_LABELS[data.status] : undefined}
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <SectionHeading icon={ArrowRightLeft}>Transfer</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
            <DetailField label="Reference #" value={data.transfer_number} />
            <DetailField label="Status" value={TRANSFER_STATUS_LABELS[data.status]} />
            <DetailField label="Type" value={data.transfer_type.replace(/_/g, ' ')} />
            <DetailField label="From Branch" value={data.source_branch?.name} />
            <DetailField label="To Branch" value={data.destination_branch?.name} />
            <DetailField label="Initiated" value={data.created_at?.slice(0, 10)} />
            {data.dispatched_at && (
              <DetailField label="Dispatched" value={data.dispatched_at.slice(0, 10)} />
            )}
            {data.received_at && (
              <DetailField label="Received" value={data.received_at.slice(0, 10)} />
            )}
            <div className="col-span-full">
              <DetailField label="Reason" value={data.reason} />
            </div>
            {data.rejection_reason && (
              <div className="col-span-full">
                <DetailField label="Rejection Reason" value={data.rejection_reason} />
              </div>
            )}
          </div>
          {data.items && data.items.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Items ({data.items.length})
              </p>
              {data.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2"
                >
                  <span>
                    {it.item_type === 'SPARE_PART'
                      ? (it.spare_part?.part_name ?? 'Spare Part')
                      : (it.model?.model_name ?? it.product?.name ?? 'Product')}
                  </span>
                  <span className="text-muted-foreground">
                    Requested {it.requested_qty}
                    {it.approved_qty != null ? ` · Approved ${it.approved_qty}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ─── Expense Entry / Expense Request — data already embedded in the activity
// event's `meta` (both are local billing_service tables the aggregation
// endpoint already queries directly), so no second fetch is needed. ────────
export function ExpenseActivityDetailModal({
  event,
  onClose,
}: {
  event: ActivityEvent;
  onClose: () => void;
}) {
  const m = event.meta ?? {};
  return (
    <ModalShell title={String(m.expenseNo ?? 'Expense')} onClose={onClose}>
      <div>
        <SectionHeading icon={Receipt}>Expense</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Expense #" value={String(m.expenseNo ?? '')} />
          <DetailField label="Category" value={String(m.category ?? '').replace(/_/g, ' ')} />
          <DetailField label="Status" value={String(m.status ?? '')} />
          <DetailField
            label="Amount"
            value={formatCurrency(Number(m.amount ?? 0), String(m.currency ?? 'AED'))}
          />
          <DetailField label="Date" value={event.time?.slice(0, 10)} />
          <div className="col-span-full">
            <DetailField label="Description" value={String(m.description ?? '')} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function ExpenseRequestActivityDetailModal({
  event,
  onClose,
}: {
  event: ActivityEvent;
  onClose: () => void;
}) {
  const m = event.meta ?? {};
  return (
    <ModalShell title={String(m.requestNo ?? 'Expense Request')} onClose={onClose}>
      <div>
        <SectionHeading icon={ClipboardList}>Expense Request</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Request #" value={String(m.requestNo ?? '')} />
          <DetailField label="Employee" value={String(m.employeeName ?? '')} />
          <DetailField label="Category" value={String(m.category ?? '').replace(/_/g, ' ')} />
          <DetailField label="Status" value={String(m.status ?? '')} />
          <DetailField
            label="Amount"
            value={formatCurrency(Number(m.amount ?? 0), String(m.currency ?? 'AED'))}
          />
          {!!m.vendorName && <DetailField label="Vendor" value={String(m.vendorName)} />}
          {!!m.reviewedByName && (
            <DetailField label="Reviewed By" value={String(m.reviewedByName)} />
          )}
          {!!m.rejectionReason && (
            <div className="col-span-full">
              <DetailField label="Rejection Reason" value={String(m.rejectionReason)} />
            </div>
          )}
          <div className="col-span-full">
            <DetailField label="Description" value={String(m.description ?? '')} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
