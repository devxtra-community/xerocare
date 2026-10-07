'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Download,
  RefreshCw,
  FileText,
  FileSignature,
  Receipt,
  Wrench,
  Truck,
  ArrowRightLeft,
  ScrollText,
  ClipboardList,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  fetchBranchActivity,
  fetchChequeById,
  type ActivityEvent,
  type Cheque,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { Button } from '@/components/ui/button';
import { ReceivableDetailModal } from './ReceivablePayableDetail';
import { ChequeDetailModal } from './ChequeDetailModal';
import {
  PurchaseDetailModal,
  ServiceTicketDetailModal,
  StockTransferDetailModal,
  ExpenseActivityDetailModal,
  ExpenseRequestActivityDetailModal,
} from './BranchActivityDetailModals';
import CreditNoteViewModal from '../returns/CreditNoteViewModal';
import type { CreditNoteRecord } from '@/lib/invoice';

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TYPE_CONFIG: Record<
  ActivityEvent['type'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  QUOTATION: {
    label: 'Quotation',
    icon: FileSignature,
    color: 'bg-primary/10 text-primary border-primary/30',
  },
  INVOICE: {
    label: 'Invoice',
    icon: FileText,
    color: 'bg-primary/10 text-primary border-primary/30',
  },
  PURCHASE: {
    label: 'Purchase',
    icon: Truck,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  SERVICE_TICKET: {
    label: 'Service Ticket',
    icon: Wrench,
    color: 'bg-lease/10 text-lease border-lease/30',
  },
  STOCK_TRANSFER: {
    label: 'Stock Transfer',
    icon: ArrowRightLeft,
    color: 'bg-info/10 text-info border-info/30',
  },
  CHEQUE: {
    label: 'Cheque',
    icon: ScrollText,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  EXPENSE: {
    label: 'Expense',
    icon: Receipt,
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  EXPENSE_REQUEST: {
    label: 'Expense Request',
    icon: ClipboardList,
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  CREDIT_NOTE: {
    label: 'Return',
    icon: RotateCcw,
    color: 'bg-success/10 text-success border-success/30',
  },
};

export function BranchActivityView({ branchId }: { branchId?: string }) {
  const currency = useBranchCurrency();
  const [date, setDate] = useState(todayLocal());
  const [viewing, setViewing] = useState<ActivityEvent | null>(null);
  const [viewingCheque, setViewingCheque] = useState<Cheque | null>(null);
  const [loadingChequeId, setLoadingChequeId] = useState<string | null>(null);

  const params: Record<string, string> = { date };
  if (branchId) params.branchId = branchId;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['branch-activity', date, branchId],
    queryFn: () => fetchBranchActivity(params),
    staleTime: 30_000,
    enabled: !!date,
  });

  const events = data?.events ?? [];

  const openView = async (event: ActivityEvent) => {
    if (event.type === 'CHEQUE') {
      setLoadingChequeId(event.id);
      try {
        const cheque = await fetchChequeById(event.refId);
        setViewingCheque(cheque);
      } finally {
        setLoadingChequeId(null);
      }
      return;
    }
    setViewing(event);
  };

  const exportExcel = () => {
    const rows: (string | number)[][] = [
      ['BRANCH DAILY ACTIVITY', '', date],
      [],
      ['Time', 'Type', 'Sub-Type', 'Title', 'Description', 'Amount', 'Currency'],
    ];
    for (const e of events) {
      rows.push([
        e.time?.slice(11, 16) ?? '',
        TYPE_CONFIG[e.type].label,
        e.subType,
        e.title,
        e.description ?? '',
        e.amount ?? '',
        e.currency ?? '',
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Activity');
    XLSX.writeFile(wb, `Branch_Activity_${date}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Everything that happened in the branch on this date — quotations, invoices, purchases,
          service tickets, stock transfers, cheques, expenses, and returns.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={exportExcel}
            disabled={events.length === 0}
            className="bg-success hover:bg-success/90 text-success-foreground gap-2"
          >
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-6 text-center space-y-3">
          <p className="text-destructive font-medium">Failed to load branch activity.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-sm border border-border p-12 text-center">
          <p className="text-muted-foreground">No activity recorded for this date.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card shadow-sm border border-border divide-y divide-border overflow-hidden">
          {events.map((e) => {
            const cfg = TYPE_CONFIG[e.type];
            const Icon = cfg.icon;
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border ${cfg.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono text-muted-foreground">
                    {e.time?.slice(11, 16)}
                  </span>
                  {e.amount != null && (
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(e.amount, e.currency)}
                    </span>
                  )}
                  <button
                    onClick={() => openView(e)}
                    disabled={loadingChequeId === e.id}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-primary disabled:opacity-50"
                    title="View full details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (viewing.type === 'QUOTATION' || viewing.type === 'INVOICE') && (
        <ReceivableDetailModal
          sourceType="INVOICE"
          id={viewing.refId}
          onClose={() => setViewing(null)}
        />
      )}
      {viewing?.type === 'PURCHASE' && (
        <PurchaseDetailModal id={viewing.refId} onClose={() => setViewing(null)} />
      )}
      {viewing?.type === 'SERVICE_TICKET' && (
        <ServiceTicketDetailModal id={viewing.refId} onClose={() => setViewing(null)} />
      )}
      {viewing?.type === 'STOCK_TRANSFER' && (
        <StockTransferDetailModal id={viewing.refId} onClose={() => setViewing(null)} />
      )}
      {viewing?.type === 'EXPENSE' && (
        <ExpenseActivityDetailModal event={viewing} onClose={() => setViewing(null)} />
      )}
      {viewing?.type === 'EXPENSE_REQUEST' && (
        <ExpenseRequestActivityDetailModal event={viewing} onClose={() => setViewing(null)} />
      )}
      {viewing?.type === 'CREDIT_NOTE' && (
        <CreditNoteViewModal
          record={viewing.meta as unknown as CreditNoteRecord}
          open
          onClose={() => setViewing(null)}
        />
      )}
      {viewingCheque && (
        <ChequeDetailModal
          cheque={viewingCheque}
          currency={currency}
          onClose={() => setViewingCheque(null)}
        />
      )}
    </div>
  );
}
