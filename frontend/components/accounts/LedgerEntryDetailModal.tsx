'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ExternalLink, Landmark, Receipt, User2 } from 'lucide-react';
import {
  ModalShell,
  DetailField,
  SectionHeading,
  ReceivableDetailBody,
  PayableDetailBody,
} from './ReceivablePayableDetail';
import { ChequeDetailBody } from './ChequeDetailModal';
import {
  fetchReceivableRowDetail,
  fetchPayableRowDetail,
  fetchChequeById,
  type ExpenseEntry,
} from '@/lib/finance/accountsApi';
import type {
  InvoiceSummary,
  PaymentRecord,
  PurchaseOrder,
  PayrollRecord,
} from '@/lib/finance/accounts';
import { EXPENSE_CATEGORY_ACCOUNT } from '@/lib/finance/generalLedgerEntries';
import type { ExpenseRequest } from '@/lib/employeeExpenses';
import { getInvoiceById, type Invoice } from '@/lib/invoice';
import { InvoiceDetailsDialog } from '@/components/invoice/InvoiceDetailsDialog';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';

export interface LedgerPairedRow {
  account: string;
  description: string;
  debit: number;
  credit: number;
  currency: string;
}

interface LedgerEntryDetailModalProps {
  source: string;
  sourceId: string;
  pairedRows: LedgerPairedRow[];
  currency: string;
  invoice?: InvoiceSummary;
  payment?: PaymentRecord;
  purchase?: PurchaseOrder;
  payroll?: PayrollRecord;
  vendorPayment?: ExpenseRequest;
  expense?: ExpenseEntry;
  onClose: () => void;
  /** Role-scoped route prefix for the "open original document" links —
   * '/finance' or '/admin'. Defaults to '/finance'. */
  basePath?: string;
}

// The "both sides together" table every source type shares — the one genuinely new
// piece of UI this feature needs (no existing page shows a raw paired debit/credit
// set), built from the same Table primitives used everywhere else in Accounts.
function PairedLedgerLines({ rows, currency }: { rows: LedgerPairedRow[]; currency: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-bold">Account</th>
            <th className="text-right px-3 py-2 font-bold">Debit</th>
            <th className="text-right px-3 py-2 font-bold">Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2 text-xs font-medium text-slate-800">{r.account}</td>
              <td className="px-3 py-2 text-right text-blue-600 font-semibold">
                {r.debit > 0 ? formatCurrency(r.debit, r.currency || currency) : '—'}
              </td>
              <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                {r.credit > 0 ? formatCurrency(r.credit, r.currency || currency) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ARInvoiceDetail({
  sourceId,
  invoice,
  onOpenInvoice,
}: {
  sourceId: string;
  invoice?: InvoiceSummary;
  onOpenInvoice: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['receivable-row-detail', 'INVOICE', sourceId],
    queryFn: () => fetchReceivableRowDetail('INVOICE', sourceId),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const taxAmount = invoice?.taxAmount ?? 0;
  const totalAmount = invoice?.totalAmount ?? data.totalAmount;
  const taxableAmount = totalAmount - taxAmount;

  return (
    <>
      <div>
        <SectionHeading icon={Receipt}>Amount Breakdown</SectionHeading>
        <div className="grid grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField
            label="Taxable Amount"
            value={formatCurrency(taxableAmount, data.currencyCode)}
          />
          <DetailField label="Tax Amount" value={formatCurrency(taxAmount, data.currencyCode)} />
          <DetailField label="Total" value={formatCurrency(totalAmount, data.currencyCode)} />
        </div>
      </div>
      <ReceivableDetailBody data={data} />
      <div className="flex justify-start">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenInvoice}>
          <ExternalLink className="h-3.5 w-3.5" /> Open Invoice
        </Button>
      </div>
    </>
  );
}

function PurchaseOrderDetail({
  sourceId,
  purchase,
  onOpenPayable,
}: {
  sourceId: string;
  purchase?: PurchaseOrder;
  onOpenPayable: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['payable-row-detail', 'PO', sourceId],
    queryFn: () => fetchPayableRowDetail('PO', sourceId),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isInternational = (purchase?.purchaseOrigin ?? data.origin) === 'INTERNATIONAL';
  const shippingHandling =
    Number(purchase?.shippingCost ?? 0) +
    Number(purchase?.handlingFee ?? 0) +
    Number(purchase?.transportationCost ?? 0) +
    Number(purchase?.groundfieldCost ?? 0);

  return (
    <>
      <PayableDetailBody data={data} />
      {isInternational && purchase && (
        <div>
          <SectionHeading icon={Landmark}>International Cost Breakdown</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
            <DetailField
              label="Vendor Purchase Cost"
              value={formatCurrency(
                Number(purchase.purchaseAmount ?? 0) + Number(purchase.documentationFee ?? 0),
                data.currencyCode,
              )}
            />
            <DetailField
              label="Shipping / Handling / Transport"
              value={
                shippingHandling > 0
                  ? formatCurrency(shippingHandling, data.currencyCode)
                  : undefined
              }
            />
            <DetailField
              label="Import Labour Cost"
              value={
                Number(purchase.labourCost ?? 0) > 0
                  ? formatCurrency(Number(purchase.labourCost), data.currencyCode)
                  : undefined
              }
            />
            <DetailField
              label="Customs Duty"
              value={
                Number(purchase.customsDuty ?? 0) > 0
                  ? formatCurrency(Number(purchase.customsDuty), data.currencyCode)
                  : undefined
              }
            />
          </div>
        </div>
      )}
      <div className="flex justify-start">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenPayable}>
          <ExternalLink className="h-3.5 w-3.5" /> Open in Accounts Payable
        </Button>
      </div>
    </>
  );
}

function PaymentDetail({
  payment,
  currency,
  onOpenCheques,
}: {
  payment?: PaymentRecord;
  currency: string;
  onOpenCheques: () => void;
}) {
  const isCheque = payment?.sourceType === 'CHEQUE_CLEAR' && !!payment.sourceId;
  const { data: cheque, isLoading } = useQuery({
    queryKey: ['cheque-detail', payment?.sourceId],
    queryFn: () => fetchChequeById(payment!.sourceId as string),
    enabled: isCheque,
  });

  return (
    <>
      <div>
        <SectionHeading icon={Receipt}>Payment</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Mode" value={payment?.method} />
          <DetailField
            label="Amount"
            value={
              payment ? formatCurrency(payment.amount, payment.currency || currency) : undefined
            }
          />
          <DetailField label="Date" value={payment?.paymentDate?.slice(0, 10)} />
          <DetailField label="Description" value={payment?.description} />
        </div>
      </div>

      <div>
        <SectionHeading icon={User2}>Audit</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
          <DetailField label="Recorded By (Employee ID)" value={payment?.createdBy} />
        </div>
      </div>

      {isCheque && (
        <div>
          <SectionHeading icon={Landmark}>Cheque Details</SectionHeading>
          {isLoading || !cheque ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <ChequeDetailBody cheque={cheque} currency={currency} />
              <div className="flex justify-start mt-3">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenCheques}>
                  <ExternalLink className="h-3.5 w-3.5" /> Open Cheques Page
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function PayrollDetail({ payroll }: { payroll?: PayrollRecord }) {
  return (
    <div>
      <SectionHeading icon={User2}>Payroll</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
        <DetailField label="Employee" value={payroll?.employeeName} />
        <DetailField
          label="Period"
          value={payroll ? `${payroll.year}-${String(payroll.month).padStart(2, '0')}` : undefined}
        />
        <DetailField
          label="Net Salary"
          value={payroll ? formatCurrency(payroll.netSalary, undefined) : undefined}
        />
      </div>
    </div>
  );
}

function VendorPaymentDetail({
  request,
  onOpenPayable,
}: {
  request?: ExpenseRequest;
  onOpenPayable: () => void;
}) {
  return (
    <div>
      <SectionHeading icon={Landmark}>Vendor Payment</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
        <DetailField label="Vendor" value={request?.vendorName} />
        <DetailField label="Purchase Ref" value={request?.purchaseRef} />
        <DetailField label="Mode" value={request?.paymentMode} />
        <DetailField
          label="Amount"
          value={request ? formatCurrency(request.amount, request.currency) : undefined}
        />
        <DetailField label="Paid On" value={request?.paidAt?.slice(0, 10)} />
        <DetailField label="Origin" value={request?.purchaseOrigin} />
      </div>
      <div className="flex justify-start mt-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenPayable}>
          <ExternalLink className="h-3.5 w-3.5" /> Open in Accounts Payable
        </Button>
      </div>
    </div>
  );
}

function ChequeSourceDetail({
  sourceId,
  currency,
  onOpenCheques,
}: {
  sourceId: string;
  currency: string;
  onOpenCheques: () => void;
}) {
  const { data: cheque, isLoading } = useQuery({
    queryKey: ['cheque-detail', sourceId],
    queryFn: () => fetchChequeById(sourceId),
  });

  if (isLoading || !cheque) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div>
      <SectionHeading icon={Landmark}>Cheque Details</SectionHeading>
      <ChequeDetailBody cheque={cheque} currency={currency} />
      <div className="flex justify-start mt-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenCheques}>
          <ExternalLink className="h-3.5 w-3.5" /> Open Cheques Page
        </Button>
      </div>
    </div>
  );
}

function ExpenseDetail({ expense }: { expense?: ExpenseEntry }) {
  const acc = expense ? EXPENSE_CATEGORY_ACCOUNT[expense.category] : undefined;
  return (
    <div>
      <SectionHeading icon={Receipt}>Expense</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 rounded-lg p-3">
        <DetailField label="Category" value={acc ? `${acc.code} ${acc.name}` : expense?.category} />
        <DetailField label="Sub-category" value={expense?.subCategory} />
        <DetailField label="Description" value={expense?.description} />
        <DetailField
          label="Amount"
          value={expense ? formatCurrency(expense.amount, expense.currency) : undefined}
        />
        <DetailField label="Mode" value={expense?.paymentMode} />
        <DetailField label="Paid On" value={expense?.paymentDate?.slice(0, 10)} />
        <DetailField label="Reference" value={expense?.referenceNo} />
      </div>
    </div>
  );
}

export function LedgerEntryDetailModal({
  source,
  sourceId,
  pairedRows,
  currency,
  invoice,
  payment,
  purchase,
  payroll,
  vendorPayment,
  expense,
  onClose,
  basePath = '/finance',
}: LedgerEntryDetailModalProps) {
  const router = useRouter();
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const openInvoice = async () => {
    const inv = await getInvoiceById(sourceId);
    setViewingInvoice(inv);
  };

  return (
    <>
      <ModalShell
        title="Transaction Detail"
        subtitle={`${source} · ${pairedRows.length} ledger line${pairedRows.length === 1 ? '' : 's'}`}
        onClose={onClose}
      >
        <div>
          <SectionHeading icon={Receipt}>Both Sides of the Entry</SectionHeading>
          <PairedLedgerLines rows={pairedRows} currency={currency} />
        </div>

        {source === 'AR Invoice' && (
          <ARInvoiceDetail sourceId={sourceId} invoice={invoice} onOpenInvoice={openInvoice} />
        )}
        {source === 'Purchase Order' && (
          <PurchaseOrderDetail
            sourceId={sourceId}
            purchase={purchase}
            onOpenPayable={() => router.push(`${basePath}/accounts/payable`)}
          />
        )}
        {source === 'Payment' && (
          <PaymentDetail
            payment={payment}
            currency={currency}
            onOpenCheques={() => router.push(`${basePath}/accounts/cheques`)}
          />
        )}
        {source === 'Payroll' && <PayrollDetail payroll={payroll} />}
        {source === 'Vendor Payment' && (
          <VendorPaymentDetail
            request={vendorPayment}
            onOpenPayable={() => router.push(`${basePath}/accounts/payable`)}
          />
        )}
        {source === 'Cheque' && (
          <ChequeSourceDetail
            sourceId={sourceId}
            currency={currency}
            onOpenCheques={() => router.push(`${basePath}/accounts/cheques`)}
          />
        )}
        {source === 'Expense' && <ExpenseDetail expense={expense} />}
      </ModalShell>

      {viewingInvoice && (
        <InvoiceDetailsDialog
          invoice={viewingInvoice}
          mode="FINANCE"
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </>
  );
}
