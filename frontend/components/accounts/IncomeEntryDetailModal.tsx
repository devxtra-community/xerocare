'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Wallet, ShieldCheck } from 'lucide-react';
import { fetchIncomeEntryDetail } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { ModalShell, DetailField, SectionHeading } from './ReceivablePayableDetail';
import { ChequeDetailBody } from './ChequeDetailModal';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

export function IncomeEntryDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['income-entry-detail', id],
    queryFn: () => fetchIncomeEntryDetail(id),
  });

  return (
    <ModalShell
      title={data?.incomeNo ?? 'Income Entry Detail'}
      subtitle={data ? data.category.replace(/_/g, ' ') : undefined}
      onClose={onClose}
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div>
            <SectionHeading icon={FileText}>Income Details</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
              <DetailField label="Income #" value={data.incomeNo} />
              <DetailField label="Category" value={data.category.replace(/_/g, ' ')} />
              {data.subCategory && <DetailField label="Sub-Category" value={data.subCategory} />}
              <DetailField label="Date" value={data.date?.slice(0, 10)} />
              <DetailField
                label="Amount"
                value={formatCurrency(Number(data.amount), data.currency)}
              />
              {Number(data.vatAmount) > 0 && (
                <DetailField
                  label="VAT Amount"
                  value={formatCurrency(Number(data.vatAmount), data.currency)}
                />
              )}
              <DetailField
                label="Net Amount"
                value={formatCurrency(Number(data.netAmount), data.currency)}
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE[data.status] ?? ''}`}
                >
                  {data.status}
                </span>
              </div>
              <DetailField label="Branch" value={data.branchId} />
              <DetailField label="Recorded By (Employee ID)" value={data.createdBy} />
              {data.description && (
                <div className="col-span-full">
                  <DetailField label="Description" value={data.description} />
                </div>
              )}
              {data.notes && (
                <div className="col-span-full">
                  <DetailField label="Notes" value={data.notes} />
                </div>
              )}
            </div>
          </div>

          {data.approvedBy && (
            <div>
              <SectionHeading icon={ShieldCheck}>Approval</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
                <DetailField label="Approved By (Employee ID)" value={data.approvedBy} />
              </div>
            </div>
          )}

          {data.status === 'RECEIVED' && (
            <div>
              <SectionHeading icon={Wallet}>How It Was Received</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
                <DetailField label="Received Via" value={data.receivedMode} />
                <DetailField
                  label="Received To"
                  value={
                    data.receivedToAccount
                      ? `${data.receivedToAccount.name} (${data.receivedToAccount.type})`
                      : null
                  }
                />
                <DetailField label="Received Date" value={data.receivedDate?.slice(0, 10)} />
                {data.referenceNo && !data.cheque && (
                  <DetailField label="Reference #" value={data.referenceNo} />
                )}
              </div>
              {data.cheque && (
                <div className="mt-3 bg-muted/20 rounded-lg p-3">
                  <ChequeDetailBody cheque={data.cheque} currency={data.currency} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}
