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
  ShieldCheck,
  Wallet,
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
import {
  Customer360Profile,
  Customer360Invoice,
  Customer360Bill,
  SalePaymentRequest,
  AgreementSummary,
  Customer360CreditNote,
  Customer360GuaranteeCheque,
  Customer360ManualReceivable,
} from '@/lib/customer360';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { ContractAgreementModal } from '@/components/employeeComponents/ContractAgreementModal';
import { BillModal } from '@/components/Finance/BillModal';
import CreditNoteViewModal from '@/components/returns/CreditNoteViewModal';
import type { CreditNoteRecord } from '@/lib/invoice';
import CustomerProductsPanel from './CustomerProductsPanel';

type Tab =
  | 'products'
  | 'quotations'
  | 'contracts'
  | 'bills'
  | 'payments'
  | 'deposits'
  | 'agreements'
  | 'receivables'
  | 'returns';

const DEPARTMENT_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  FINANCE: 'Finance',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
  HR: 'HR',
};

const BILL_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  CUSTOMER_APPROVED: {
    label: 'Customer Approved',
    className: 'bg-success/10 text-success border-success/30',
  },
  CUSTOMER_REJECTED: {
    label: 'Disputed',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

function DepartmentBadge({ role }: { role?: string }) {
  if (!role) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30">
      {DEPARTMENT_LABELS[role] ?? role}
    </span>
  );
}

function CreatedAtCell({ date }: { date?: string }) {
  if (!date) return <span className="text-[10px] text-muted-foreground">—</span>;
  const d = new Date(date);
  return (
    <div className="text-xs text-muted-foreground leading-tight">
      <div>{d.toLocaleDateString()}</div>
      <div className="text-[10px] text-muted-foreground">
        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

const PAYMENT_CONTEXT_LABELS: Record<string, string> = {
  SALE: 'Sale',
  RENT_ADVANCE: 'Rent Advance',
  RENT_PERIODIC: 'Rent Periodic',
  LEASE_ADVANCE: 'Lease Advance',
  LEASE_PERIODIC: 'Lease Periodic',
};

const SALE_TYPE_COLORS: Record<string, string> = {
  PRODUCT_SALE: 'bg-primary/10 text-primary border-primary/30',
  RENTAL: 'bg-success/10 text-success border-success/30',
  LEASE: 'bg-lease/10 text-lease border-lease/30',
  SPAREPART_SALE: 'bg-warning/10 text-warning border-warning/30',
  SERVICE: 'bg-muted text-foreground border-border',
};

const SIG_STATUS_COLORS: Record<string, string> = {
  FULLY_SIGNED: 'bg-success/10 text-success border-success/30',
  EMPLOYEE_SIGNED: 'bg-warning/10 text-warning border-warning/30',
  UNSIGNED: 'bg-muted text-muted-foreground border-border',
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE_CONTRACT':
    case 'APPROVED':
    case 'ACTIVE':
      return 'bg-success/10 text-success border-success/30';
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'WAITING_FINANCE_APPROVAL':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'COMPLETED':
    case 'PAID':
      return 'bg-muted text-foreground border-border';
    default:
      return 'bg-muted text-foreground border-border';
  }
}

function PaymentStatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (status === 'REJECTED') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-warning" />;
}

interface Props {
  customer: Customer;
  profile: Customer360Profile;
  lead?: Lead | null;
  createdByName?: string;
  createdByRole?: string;
  backHref: string;
  /** Shown as a banner under the header when this profile is scoped narrower than the
   *  full branch history (e.g. the Employee personal-only view). */
  scopeNotice?: string;
  /** e.g. "/manager" or "/admin" — only passed by roles with a product detail
   *  page, so the Products & Services tab can link machine cards through to
   *  it. Omit for roles without one (employee/finance/hr). */
  productBasePath?: string;
}

export default function Customer360View({
  customer,
  profile,
  lead,
  createdByName,
  createdByRole,
  backHref,
  scopeNotice,
  productBasePath,
}: Props) {
  const router = useRouter();
  const currency = useBranchCurrency();
  const [activeTab, setActiveTab] = useState<Tab>('products');

  // Contract Agreement modal state
  const [agreementInvoice, setAgreementInvoice] = useState<Invoice | null>(null);
  // Bill modal state
  const [viewingBillId, setViewingBillId] = useState<string | null>(null);
  // Credit Note modal state
  const [viewingCreditNote, setViewingCreditNote] = useState<CreditNoteRecord | null>(null);

  const {
    invoices,
    payments,
    agreements,
    bills,
    creditNotes: creditNoteList,
    guaranteeCheques,
    manualReceivables,
    securityDeposits,
    summary,
  } = profile;

  // Build a quick lookup map: invoiceId → AgreementSummary
  const agreementByInvoiceId = new Map<string, AgreementSummary>(
    agreements.map((a) => [a.invoiceId, a]),
  );

  const quotations = invoices.filter((i) => i.type === 'QUOTATION');
  const contracts = invoices.filter((i) => i.type !== 'QUOTATION');
  // Credit notes now come from their own query rather than being dug out of the invoice
  // relation — a return raised against an invoice outside this branch/creator filter was
  // previously invisible here.
  const invoiceNumberById = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));
  const creditNotes = creditNoteList.map((cn) => ({
    ...cn,
    invoiceNumber: cn.invoiceNumber ?? invoiceNumberById.get(cn.invoiceId),
    customerName: customer.name,
    customerId: customer.id,
  }));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'products', label: 'Products & Services', count: 0 },
    { id: 'contracts', label: 'Contracts', count: contracts.length },
    { id: 'quotations', label: 'Quotations', count: quotations.length },
    { id: 'bills', label: 'Rent/Lease Bills', count: bills.length },
    { id: 'payments', label: 'Receipts & Payments', count: payments.length },
    {
      id: 'deposits',
      label: 'Security Deposits',
      count: securityDeposits.length + guaranteeCheques.length,
    },
    // agreements were already being fetched and were never shown anywhere.
    { id: 'agreements', label: 'Agreements', count: agreements.length },
    { id: 'receivables', label: 'Other Receivables', count: manualReceivables.length },
    { id: 'returns', label: 'Returns / Credit Notes', count: creditNotes.length },
  ];

  return (
    <div className="min-h-screen bg-muted p-4 md:p-6 space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
          className="gap-1.5 text-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-medium text-foreground">Customer 360° Profile</h1>
          <p className="text-xs text-muted-foreground">Complete view of all customer touchpoints</p>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Avatar + Name */}
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{customer.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    customer.isActive
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {customer.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {customer.customerType && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30">
                    {customer.customerType}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <UserCheck className="h-3 w-3" /> Created by: {createdByName}
                    {createdByRole && (
                      <span className="text-muted-foreground font-normal">({createdByRole})</span>
                    )}
                  </span>
                )}
              </div>
              {lead && (
                <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Converted from lead:{' '}
                  <span className="font-medium text-foreground">{lead.name}</span>
                  {lead.source && <span className="text-muted-foreground">({lead.source})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="md:ml-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 md:mt-0">
            <div className="bg-muted rounded-xl border border-border px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Contracts
              </p>
              <p className="text-xl font-bold text-foreground mt-0.5">{summary.contractCount}</p>
            </div>
            <div className="bg-muted rounded-xl border border-border px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Invoiced
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {currency} {summary.totalInvoiced.toLocaleString()}
              </p>
            </div>
            <div className="bg-muted rounded-xl border border-border px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Paid
              </p>
              <p className="text-lg font-bold text-success mt-0.5">
                {currency} {summary.totalPaid.toLocaleString()}
              </p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 text-center ${
                summary.totalOutstanding > 0
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-muted border-border'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Outstanding
              </p>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  summary.totalOutstanding > 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {currency} {summary.totalOutstanding.toLocaleString()}
              </p>
              {/* Negative means the customer has paid more than was invoiced. It used to
                  be clamped to 0, which hid a real overpayment and disagreed with
                  Receivables. */}
              {summary.totalOutstanding < 0 && (
                <p className="text-[10px] text-success font-semibold mt-0.5">
                  Overpaid by {currency} {Math.abs(summary.totalOutstanding).toLocaleString()}
                </p>
              )}
              {summary.manualOutstanding > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  incl. {currency} {summary.manualOutstanding.toLocaleString()} non-invoice
                </p>
              )}
            </div>
            {summary.totalDepositsHeld > 0 && (
              <div className="bg-primary/10 rounded-xl border border-primary/30 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                  Deposits Held
                </p>
                <p className="text-lg font-bold text-primary mt-0.5">
                  {currency} {summary.totalDepositsHeld.toLocaleString()}
                </p>
                <p className="text-[10px] text-primary mt-0.5">refundable — not income</p>
              </div>
            )}
            {summary.guaranteeChequeValue > 0 && (
              <div className="bg-muted rounded-xl border border-border px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Guarantee Cheques
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {currency} {summary.guaranteeChequeValue.toLocaleString()}
                </p>
              </div>
            )}
            {summary.creditNoteValue > 0 && (
              <div className="bg-muted rounded-xl border border-border px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Returns
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {currency} {summary.creditNoteValue.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bank / VAT */}
        {(customer.bankName || customer.bankAccountNumber || customer.vatNumber) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
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

      {scopeNotice && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-warning font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {scopeNotice}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {activeTab === 'products' && (
            <CustomerProductsPanel customerId={customer.id} productBasePath={productBasePath} />
          )}
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
          {activeTab === 'bills' && (
            <BillsTab bills={bills} currency={currency} onViewBill={setViewingBillId} />
          )}
          {activeTab === 'payments' && <PaymentsTab payments={payments} />}
          {activeTab === 'deposits' && (
            <DepositsTab
              deposits={securityDeposits}
              cheques={guaranteeCheques}
              currency={currency}
            />
          )}
          {activeTab === 'agreements' && (
            <AgreementsTab agreements={agreements} invoiceNumberById={invoiceNumberById} />
          )}
          {activeTab === 'receivables' && (
            <ReceivablesTab rows={manualReceivables} currency={currency} />
          )}
          {activeTab === 'returns' && (
            <ReturnsTab
              creditNotes={creditNotes}
              currency={currency}
              onView={(cn) => setViewingCreditNote(cn as unknown as CreditNoteRecord)}
            />
          )}
        </div>
      </div>

      {/* Bill Modal — reuses the existing component unchanged */}
      {viewingBillId && (
        <BillModal
          usageRecordId={viewingBillId}
          open={!!viewingBillId}
          onClose={() => setViewingBillId(null)}
        />
      )}

      {/* Credit Note Modal — reuses the existing component unchanged */}
      <CreditNoteViewModal
        record={viewingCreditNote}
        open={!!viewingCreditNote}
        onClose={() => setViewingCreditNote(null)}
      />

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
    <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
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
  invoices: Customer360Invoice[];
  currency: string;
  agreementByInvoiceId: Map<string, AgreementSummary>;
  onViewAgreement: (inv: Invoice) => void;
}) {
  if (invoices.length === 0)
    return <EmptyState icon={FileText} message="No contracts on record for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Invoice #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Type
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Amount
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Period
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Agreement
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Created Date/Time
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Department
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const agreement = agreementByInvoiceId.get(inv.id);
          return (
            <TableRow key={inv.id} className="hover:bg-muted/50">
              <TableCell className="font-mono text-xs font-semibold text-foreground">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    SALE_TYPE_COLORS[inv.saleType] ?? 'bg-muted text-foreground border-border'
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
              <TableCell className="font-semibold text-xs text-foreground font-mono">
                {currency} {Number(inv.totalAmount).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
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
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary hover:underline"
                    >
                      <FileSignature className="h-3.5 w-3.5" /> View Agreement
                    </button>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit ${
                        SIG_STATUS_COLORS[agreement.signatureStatus] ??
                        'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {agreement.signatureStatus?.replace('_', ' ')}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <AlertCircle className="h-3 w-3" /> Not yet created
                  </span>
                )}
              </TableCell>
              <TableCell>
                <CreatedAtCell date={inv.createdAt} />
              </TableCell>
              <TableCell>
                <DepartmentBadge role={inv.createdByRole} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function QuotationsTab({
  invoices,
  currency,
}: {
  invoices: Customer360Invoice[];
  currency: string;
}) {
  if (invoices.length === 0)
    return <EmptyState icon={FileText} message="No quotations on record for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Quotation #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Type
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Amount
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Created Date/Time
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Department
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Converted
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs font-semibold text-foreground">
              {inv.invoiceNumber}
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  SALE_TYPE_COLORS[inv.saleType] ?? 'bg-muted text-foreground border-border'
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
            <TableCell className="font-semibold text-xs text-foreground font-mono">
              {currency} {Number(inv.totalAmount).toLocaleString()}
            </TableCell>
            <TableCell>
              <CreatedAtCell date={inv.createdAt} />
            </TableCell>
            <TableCell>
              <DepartmentBadge role={inv.createdByRole} />
            </TableCell>
            <TableCell className="text-xs">
              {inv.isConverted ? (
                <span className="flex items-center gap-1 text-success font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Yes
                </span>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BillsTab({
  bills,
  currency,
  onViewBill,
}: {
  bills: Customer360Bill[];
  currency: string;
  onViewBill: (usageRecordId: string) => void;
}) {
  if (bills.length === 0)
    return <EmptyState icon={FileText} message="No Rent/Lease bills on record for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Type
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Period
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Amount
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Bill Document
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Created Date/Time
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Department
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((b) => {
          const statusMeta = BILL_STATUS_META[b.billStatus] ?? {
            label: b.billStatus,
            className: 'bg-muted text-muted-foreground border-border',
          };
          const isAdvance = b.billType === 'ADVANCE';
          return (
            <TableRow key={b.id} className="hover:bg-muted/50">
              <TableCell>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isAdvance
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted text-foreground border-border'
                  }`}
                >
                  {isAdvance ? 'Advance' : 'Usage'}
                </span>
              </TableCell>
              <TableCell className="text-xs text-foreground">
                {isAdvance
                  ? new Date(b.billingPeriodStart).toLocaleDateString()
                  : `${new Date(b.billingPeriodStart).toLocaleDateString()} → ${new Date(b.billingPeriodEnd).toLocaleDateString()}`}
              </TableCell>
              <TableCell>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
                {b.billStatus === 'CUSTOMER_REJECTED' && b.customerRejectionReason && (
                  <p
                    className="text-[10px] text-destructive mt-0.5 max-w-48 truncate"
                    title={b.customerRejectionReason}
                  >
                    {b.customerRejectionReason}
                  </p>
                )}
              </TableCell>
              <TableCell className="font-semibold text-xs text-foreground font-mono">
                {currency} {Number(b.totalCharge).toLocaleString()}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => onViewBill(b.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> View Bill
                </button>
              </TableCell>
              <TableCell>
                <CreatedAtCell date={b.createdAt} />
              </TableCell>
              <TableCell>
                <DepartmentBadge role={b.createdByRole} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function PaymentsTab({ payments }: { payments: SalePaymentRequest[] }) {
  if (payments.length === 0)
    return <EmptyState icon={CreditCard} message="No payment records for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Ref #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Invoice
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Context
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Mode
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Amount
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Date
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Receipt
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Recorded By
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Created Date/Time
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Department
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs font-semibold text-foreground">
              {p.requestNo}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {p.invoiceNumber}
            </TableCell>
            <TableCell className="text-xs text-foreground">
              {p.paymentContext
                ? (PAYMENT_CONTEXT_LABELS[p.paymentContext] ?? p.paymentContext)
                : '—'}
            </TableCell>
            <TableCell className="text-xs">
              <span className="bg-muted border border-border rounded px-1.5 py-0.5 text-foreground font-medium text-[10px]">
                {p.paymentMode.replace('_', ' ')}
              </span>
            </TableCell>
            <TableCell className="font-semibold text-xs text-foreground font-mono">
              {p.currency} {Number(p.amount).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
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
                  className="inline-flex items-center gap-1 text-xs font-semibold text-success hover:text-success hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" /> View Receipt
                </a>
              ) : p.status === 'PENDING' ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-warning">
                  <Clock className="h-3 w-3" /> Pending approval
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-xs text-foreground">{p.recordedByEmployeeName}</TableCell>
            <TableCell>
              <CreatedAtCell date={p.createdAt} />
            </TableCell>
            <TableCell>
              <DepartmentBadge role={p.createdByRole} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Sourced from the profile's own creditNotes query now, so the shape is
// Customer360CreditNote rather than the invoice relation's nested item. modelName/brand
// are not selected by that query and are optional here.
/**
 * Refundable money held against a contract — cash/bank deposits and guarantee cheques.
 *
 * Kept apart from Receipts & Payments on purpose: a deposit is an obligation to return,
 * not payment of the contract, and mixing the two is what made "Total Paid" overstate
 * what a customer had actually settled.
 */
function DepositsTab({
  deposits,
  cheques,
  currency,
}: {
  deposits: SalePaymentRequest[];
  cheques: Customer360GuaranteeCheque[];
  currency: string;
}) {
  if (deposits.length === 0 && cheques.length === 0)
    return <EmptyState icon={ShieldCheck} message="No security deposits held for this customer" />;

  return (
    <div className="space-y-6">
      {deposits.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Cash / Bank Deposits
          </h4>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Against</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount Held</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs text-foreground">{d.requestNo}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {d.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {d.paymentMode?.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {d.paymentDate ? new Date(d.paymentDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {currency} {Number(d.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {cheques.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Guarantee Cheques
          </h4>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Cheque #</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cheques.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-foreground">
                    {c.chequeNumber}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">{c.bankName ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.contractReference ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {c.receivedDate ? new Date(c.receivedDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-muted text-foreground border-border">
                      {c.status ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {c.currencyCode ?? currency} {Number(c.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** Contract agreements and where each one is in the signing process. These were already
 *  being fetched by the profile endpoint and had no tab to appear in. */
function AgreementsTab({
  agreements,
  invoiceNumberById,
}: {
  agreements: AgreementSummary[];
  invoiceNumberById: Map<string, string>;
}) {
  if (agreements.length === 0)
    return <EmptyState icon={FileSignature} message="No agreements for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Agreement #</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead>Signature Status</TableHead>
          <TableHead>Employee Signed</TableHead>
          <TableHead>Customer Signed</TableHead>
          <TableHead>Prepared By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agreements.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-mono text-xs text-foreground">{a.agreementNumber}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {invoiceNumberById.get(a.invoiceId) ?? '—'}
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  a.customerSignedAt
                    ? 'bg-success/10 text-success border-success/30'
                    : 'bg-warning/10 text-warning border-warning/30'
                }`}
              >
                {a.signatureStatus?.replace(/_/g, ' ') ?? '—'}
              </span>
            </TableCell>
            <TableCell className="text-xs text-foreground">
              {a.employeeSignedAt ? new Date(a.employeeSignedAt).toLocaleDateString() : '—'}
            </TableCell>
            <TableCell className="text-xs text-foreground">
              {a.customerSignedAt ? new Date(a.customerSignedAt).toLocaleDateString() : '—'}
            </TableCell>
            <TableCell className="text-xs text-foreground">
              {a.createdByEmployeeName ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Debt raised outside an invoice — a Credit Exchange difference, an advance. Real money
 *  the customer owes that the contract tabs cannot show. */
function ReceivablesTab({
  rows,
  currency,
}: {
  rows: Customer360ManualReceivable[];
  currency: string;
}) {
  if (rows.length === 0)
    return <EmptyState icon={Wallet} message="No other receivables for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const outstanding = Number(r.outstanding ?? Number(r.amount) - Number(r.amountPaid ?? 0));
          return (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs text-foreground">{r.referenceNo}</TableCell>
              <TableCell className="text-xs text-foreground">
                {r.type?.replace(/_/g, ' ')}
              </TableCell>
              <TableCell
                className="text-xs text-foreground max-w-64 truncate"
                title={r.description}
              >
                {r.description ?? '—'}
              </TableCell>
              <TableCell className="text-xs text-foreground">
                {r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell className="text-right text-xs text-foreground">
                {currency} {Number(r.amount).toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-xs text-success">
                {currency} {Number(r.amountPaid ?? 0).toLocaleString()}
              </TableCell>
              <TableCell
                className={`text-right font-bold ${outstanding > 0 ? 'text-destructive' : 'text-foreground'}`}
              >
                {currency} {outstanding.toLocaleString()}
              </TableCell>
              <TableCell>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-muted text-foreground border-border">
                  {r.status}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

type CreditNoteRow = Customer360CreditNote & {
  invoiceNumber?: string;
  customerName: string;
  customerId: string;
};

function ReturnsTab({
  creditNotes,
  currency,
  onView,
}: {
  creditNotes: CreditNoteRow[];
  currency: string;
  onView: (cn: CreditNoteRow) => void;
}) {
  if (creditNotes.length === 0)
    return <EmptyState icon={RotateCcw} message="No returns or credit notes for this customer" />;

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Credit Note #
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Invoice
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Product
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Type
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Amount
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
            Created Date/Time
          </TableHead>
          <TableHead
            className="text-[11px] font-bold uppercase text-muted-foreground"
            title="Credit notes don't record a creator/department in this system"
          >
            Department
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {creditNotes.map((cn) => (
          <TableRow key={cn.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs font-semibold">
              <button
                onClick={() => onView(cn)}
                className="text-primary hover:text-primary hover:underline"
              >
                {cn.creditNoteNo}
              </button>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {cn.invoiceNumber}
            </TableCell>
            <TableCell className="text-xs text-foreground">
              {cn.productName ?? '—'}
              {/* Serial identifies the exact unit returned; modelName is not selected by
                  the credit-note query this tab now reads from. */}
              {cn.serialNumber && (
                <span className="text-muted-foreground ml-1">({cn.serialNumber})</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-muted text-foreground border-border">
                {cn.type?.replace('_', ' ')}
              </span>
            </TableCell>
            <TableCell className="font-semibold text-xs text-foreground font-mono">
              {currency} {Number(cn.productAmount).toLocaleString()}
            </TableCell>
            <TableCell>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass(cn.status)}`}
              >
                {cn.status}
              </span>
            </TableCell>
            <TableCell>
              <CreatedAtCell date={cn.createdAt} />
            </TableCell>
            <TableCell
              className="text-[10px] text-muted-foreground"
              title="Not tracked for credit notes"
            >
              —
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
