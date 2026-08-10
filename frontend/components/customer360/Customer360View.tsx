'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Banknote,
  Building,
  FileSignature,
  Receipt,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Customer } from '@/lib/customer';
import { Lead } from '@/lib/lead';
import { Invoice } from '@/lib/invoice';
import { Customer360Profile, SalePaymentRequest, AgreementSummary } from '@/lib/customer360';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { ContractAgreementModal } from '@/components/employeeComponents/ContractAgreementModal';

type Tab = 'quotations' | 'contracts' | 'payments' | 'returns';

const PAYMENT_CONTEXT_LABELS: Record<string, string> = {
  SALE: 'Sale',
  RENT_ADVANCE: 'Rent Advance',
  RENT_PERIODIC: 'Rent Periodic',
  LEASE_ADVANCE: 'Lease Advance',
  LEASE_PERIODIC: 'Lease Periodic',
};

const SALE_TYPE_COLORS: Record<string, string> = {
  PRODUCT_SALE: 'bg-blue-50 text-blue-700 border-blue-100',
  RENTAL: 'bg-green-50 text-green-700 border-green-100',
  LEASE: 'bg-purple-50 text-purple-700 border-purple-100',
  SPAREPART_SALE: 'bg-amber-50 text-amber-700 border-amber-100',
  SERVICE: 'bg-slate-50 text-slate-700 border-slate-100',
};

const SIG_STATUS_COLORS: Record<string, string> = {
  FULLY_SIGNED: 'bg-green-50 text-green-700 border-green-100',
  EMPLOYEE_SIGNED: 'bg-amber-50 text-amber-700 border-amber-100',
  UNSIGNED: 'bg-slate-50 text-slate-500 border-slate-100',
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE_CONTRACT':
    case 'APPROVED':
    case 'ACTIVE':
      return 'bg-green-50 text-green-700 border-green-100';
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'WAITING_FINANCE_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'COMPLETED':
    case 'PAID':
      return 'bg-slate-50 text-slate-700 border-slate-100';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100';
  }
}

function PaymentStatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  if (status === 'REJECTED') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
}

interface Props {
  customer: Customer;
  profile: Customer360Profile;
  lead?: Lead | null;
  createdByName?: string;
  createdByRole?: string;
  backHref: string;
}

export default function Customer360View({
  customer,
  profile,
  lead,
  createdByName,
  createdByRole,
  backHref,
}: Props) {
  const router = useRouter();
  const currency = useBranchCurrency();
  const [activeTab, setActiveTab] = useState<Tab>('contracts');

  // Contract Agreement modal state
  const [agreementInvoice, setAgreementInvoice] = useState<Invoice | null>(null);

  const { invoices, payments, agreements, summary } = profile;

  // Build a quick lookup map: invoiceId → AgreementSummary
  const agreementByInvoiceId = new Map<string, AgreementSummary>(
    agreements.map((a) => [a.invoiceId, a]),
  );

  const quotations = invoices.filter((i) => i.type === 'QUOTATION');
  const contracts = invoices.filter((i) => i.type !== 'QUOTATION');
  const creditNotes = invoices.flatMap((inv) =>
    (inv.creditNotes ?? []).map((cn) => ({ ...cn, invoiceNumber: inv.invoiceNumber })),
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'contracts', label: 'Contracts', count: contracts.length },
    { id: 'quotations', label: 'Quotations', count: quotations.length },
    { id: 'payments', label: 'Payments', count: payments.length },
    { id: 'returns', label: 'Returns / Credit Notes', count: creditNotes.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer 360° Profile</h1>
          <p className="text-xs text-slate-500">Complete view of all customer touchpoints</p>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Avatar + Name */}
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    customer.isActive
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {customer.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {customer.customerType && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                    {customer.customerType}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </span>
                )}
                {(customer.location || customer.address) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {customer.location || customer.address}
                  </span>
                )}
                {customer.branch_id && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Branch: {customer.branch_id.slice(0, 8)}…
                  </span>
                )}
                {/* Created-by employee — shown when resolved */}
                {createdByName && (
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <UserCheck className="h-3 w-3" /> Created by: {createdByName}
                    {createdByRole && (
                      <span className="text-slate-400 font-normal">({createdByRole})</span>
                    )}
                  </span>
                )}
              </div>
              {lead && (
                <div className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Converted from lead:{' '}
                  <span className="font-medium text-slate-600">{lead.name}</span>
                  {lead.source && <span className="text-slate-400">({lead.source})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="md:ml-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 md:mt-0">
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Contracts
              </p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{summary.contractCount}</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Invoiced
              </p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {currency} {summary.totalInvoiced.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Paid
              </p>
              <p className="text-lg font-bold text-green-700 mt-0.5">
                {currency} {summary.totalPaid.toLocaleString()}
              </p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 text-center ${
                summary.totalOutstanding > 0
                  ? 'bg-red-50 border-red-100'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Outstanding
              </p>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  summary.totalOutstanding > 0 ? 'text-red-700' : 'text-slate-800'
                }`}
              >
                {currency} {summary.totalOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Bank / VAT */}
        {(customer.bankName || customer.bankAccountNumber || customer.vatNumber) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            {customer.bankName && (
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" /> {customer.bankName}
              </span>
            )}
            {customer.bankAccountNumber && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3 w-3" /> {customer.bankAccountNumber}
              </span>
            )}
            {customer.vatNumber && (
              <span className="flex items-center gap-1">
                <Receipt className="h-3 w-3" /> TRN: {customer.vatNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-700 bg-indigo-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {activeTab === 'contracts' && (
            <ContractsTab
              invoices={contracts}
              currency={currency}
              agreementByInvoiceId={agreementByInvoiceId}
              onViewAgreement={(inv) => setAgreementInvoice(inv)}
            />
          )}
          {activeTab === 'quotations' && (
            <QuotationsTab invoices={quotations} currency={currency} />
          )}
          {activeTab === 'payments' && <PaymentsTab payments={payments} />}
          {activeTab === 'returns' && <ReturnsTab creditNotes={creditNotes} currency={currency} />}
        </div>
      </div>

      {/* Contract Agreement Modal — reuses the existing component unchanged */}
      {agreementInvoice && (
        <ContractAgreementModal
          invoice={agreementInvoice}
          customer={customer}
          open={!!agreementInvoice}
          onClose={() => setAgreementInvoice(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-tab components ──────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
      <Icon className="h-8 w-8" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function ContractsTab({
  invoices,
  currency,
  agreementByInvoiceId,
  onViewAgreement,
}: {
  invoices: Invoice[];
  currency: string;
  agreementByInvoiceId: Map<string, AgreementSummary>;
  onViewAgreement: (inv: Invoice) => void;
}) {
  if (invoices.length === 0)
    return <EmptyState icon={FileText} message="No contracts on record for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">
            Invoice #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Type</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Status</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Amount</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Period</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">
            Agreement
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const agreement = agreementByInvoiceId.get(inv.id);
          return (
            <TableRow key={inv.id} className="hover:bg-slate-50/50">
              <TableCell className="font-mono text-xs font-semibold text-slate-800">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    SALE_TYPE_COLORS[inv.saleType] ?? 'bg-slate-50 text-slate-600 border-slate-100'
                  }`}
                >
                  {inv.saleType?.replace('_', ' ')}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(
                    inv.contractStatus ?? inv.status,
                  )}`}
                >
                  {inv.contractStatus ?? inv.status}
                </span>
              </TableCell>
              <TableCell className="font-semibold text-xs text-slate-700 font-mono">
                {currency} {Number(inv.totalAmount).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {inv.effectiveFrom
                  ? `${new Date(inv.effectiveFrom).toLocaleDateString()} → ${
                      inv.effectiveTo ? new Date(inv.effectiveTo).toLocaleDateString() : '…'
                    }`
                  : '—'}
              </TableCell>
              {/* Agreement cell */}
              <TableCell>
                {agreement ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onViewAgreement(inv)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <FileSignature className="h-3.5 w-3.5" /> View Agreement
                    </button>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit ${
                        SIG_STATUS_COLORS[agreement.signatureStatus] ??
                        'bg-slate-50 text-slate-500 border-slate-100'
                      }`}
                    >
                      {agreement.signatureStatus?.replace('_', ' ')}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <AlertCircle className="h-3 w-3" /> Not yet created
                  </span>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {new Date(inv.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function QuotationsTab({ invoices, currency }: { invoices: Invoice[]; currency: string }) {
  if (invoices.length === 0)
    return <EmptyState icon={FileText} message="No quotations on record for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">
            Quotation #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Type</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Status</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Amount</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Created</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">
            Converted
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id} className="hover:bg-slate-50/50">
            <TableCell className="font-mono text-xs font-semibold text-slate-800">
              {inv.invoiceNumber}
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  SALE_TYPE_COLORS[inv.saleType] ?? 'bg-slate-50 text-slate-600 border-slate-100'
                }`}
              >
                {inv.saleType?.replace('_', ' ')}
              </span>
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(inv.status)}`}
              >
                {inv.status}
              </span>
            </TableCell>
            <TableCell className="font-semibold text-xs text-slate-700 font-mono">
              {currency} {Number(inv.totalAmount).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs text-slate-400">
              {new Date(inv.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-xs">
              {inv.isConverted ? (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Yes
                </span>
              ) : (
                <span className="text-slate-400">No</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PaymentsTab({ payments }: { payments: SalePaymentRequest[] }) {
  if (payments.length === 0)
    return <EmptyState icon={CreditCard} message="No payment records for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Ref #</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Invoice</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Context</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Mode</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Amount</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Date</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Status</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Receipt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id} className="hover:bg-slate-50/50">
            <TableCell className="font-mono text-xs font-semibold text-slate-700">
              {p.requestNo}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-500">{p.invoiceNumber}</TableCell>
            <TableCell className="text-xs text-slate-600">
              {p.paymentContext
                ? (PAYMENT_CONTEXT_LABELS[p.paymentContext] ?? p.paymentContext)
                : '—'}
            </TableCell>
            <TableCell className="text-xs">
              <span className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 font-medium text-[10px]">
                {p.paymentMode.replace('_', ' ')}
              </span>
            </TableCell>
            <TableCell className="font-semibold text-xs text-slate-700 font-mono">
              {p.currency} {Number(p.amount).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs text-slate-400">
              {new Date(p.paymentDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <PaymentStatusIcon status={p.status} />
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusBadgeClass(p.status)}`}
                >
                  {p.status}
                  {p.collectLater && p.status === 'PENDING' ? ' (Collect Later)' : ''}
                </span>
              </div>
            </TableCell>
            {/* Receipt cell — only available once Finance approves */}
            <TableCell>
              {p.status === 'APPROVED' && p.receiptUrl ? (
                <a
                  href={p.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" /> View Receipt
                </a>
              ) : p.status === 'PENDING' ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                  <Clock className="h-3 w-3" /> Pending approval
                </span>
              ) : (
                <span className="text-[10px] text-slate-300">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type CreditNoteItem = NonNullable<Invoice['creditNotes']>[number];
type CreditNoteRow = CreditNoteItem & { invoiceNumber: string };

function ReturnsTab({ creditNotes, currency }: { creditNotes: CreditNoteRow[]; currency: string }) {
  if (creditNotes.length === 0)
    return <EmptyState icon={RotateCcw} message="No returns or credit notes for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">
            Credit Note #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Invoice</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Product</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Type</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Amount</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Status</TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-slate-500">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {creditNotes.map((cn) => (
          <TableRow key={cn.id} className="hover:bg-slate-50/50">
            <TableCell className="font-mono text-xs font-semibold text-slate-700">
              {cn.creditNoteNo}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-500">{cn.invoiceNumber}</TableCell>
            <TableCell className="text-xs text-slate-700">
              {cn.productName ?? '—'}
              {cn.modelName && <span className="text-slate-400 ml-1">({cn.modelName})</span>}
            </TableCell>
            <TableCell>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-100">
                {cn.type?.replace('_', ' ')}
              </span>
            </TableCell>
            <TableCell className="font-semibold text-xs text-slate-700 font-mono">
              {currency} {Number(cn.productAmount).toLocaleString()}
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(cn.status)}`}
              >
                {cn.status}
              </span>
            </TableCell>
            <TableCell className="text-xs text-slate-400">
              {cn.createdAt ? new Date(cn.createdAt).toLocaleDateString() : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
