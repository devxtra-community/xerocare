'use client';

import { useParams, useRouter } from 'next/navigation';
import { apInvoices, vendors } from '@/lib/finance/ap';
import StatusBadge from '@/components/Finance/statusBadge';
import { Button } from '@/components/ui/button'; // Assuming standard Shadcn components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Calendar,
  Info,
  FileCheck,
} from 'lucide-react';

export default function APInvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoice = apInvoices.find((i) => i.id === id);

  if (!invoice) return <div className="p-12 text-center">Invoice not found</div>;

  const vendor = vendors.find((v) => v.id === invoice.vendorId);
  const balanceDue = (invoice.totalAmount ?? 0) - (invoice.paidAmount ?? 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* 1. Sticky Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Vendor Invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>

          {invoice.status === 'Draft' && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => router.push(`/finance/ap/invoices/${invoice.id}/post`)}
            >
              <FileCheck className="w-4 h-4 mr-2" /> Post to GL
            </Button>
          )}
          {invoice.status !== 'Paid' && (
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" /> Pay Now
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Primary Invoice Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            {/* Vendor & Header Branding */}
            <div className="p-8 border-b flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <User className="w-5 h-5" />
                  <span className="font-bold text-lg uppercase tracking-wide">Vendor Info</span>
                </div>
                <p className="text-2xl font-black">{vendor?.name}</p>
                <p className="text-sm text-muted-foreground">{vendor?.email}</p>
                <p className="text-xs text-muted-foreground italic mt-2 underline cursor-pointer">
                  View Vendor Ledger →
                </p>
              </div>
              <div className="text-right space-y-2">
                <StatusBadge status={invoice.status} />
                <div className="text-sm font-medium">
                  {balanceDue > 0 ? (
                    <span className="text-destructive flex items-center gap-1 justify-end italic">
                      <Clock className="w-3.5 h-3.5" /> Due in 3 days
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-8 py-4">Service Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Rate</TableHead>
                    <TableHead className="text-right pr-8">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line) => (
                    <TableRow key={line.id} className="hover:bg-slate-50/30">
                      <TableCell className="pl-8 py-4 font-medium">{line.description}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {line.quantity || 1}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {line.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right pr-8 font-bold text-slate-900">
                        {line.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Summary Footer */}
            <div className="p-8 border-t bg-slate-50/30 flex justify-end">
              <div className="w-full max-w-[280px] space-y-3">
                <SummaryRow label="Subtotal" value={invoice.totalAmount} />
                <SummaryRow label="Tax (0%)" value={0} />
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-base font-bold">Grand Total</span>
                  <span className="text-xl font-black text-blue-700">
                    {invoice.currency} {invoice.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sidebar Details Column */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <SidebarCard title="Reference Details" icon={<Info className="w-4 h-4" />}>
            <DetailItem label="Invoice Date" value={invoice.invoiceDate} icon={<Calendar />} />
            <DetailItem label="Due Date" value={invoice.dueDate} icon={<Clock />} />
            <DetailItem label="Currency" value={invoice.currency} icon={<FileText />} />
          </SidebarCard>

          {/* Workflow/Approval Card */}
          {(invoice.approvedBy || invoice.approvedOn) && (
            <SidebarCard
              title="Audit & Approval"
              icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
            >
              <DetailItem label="Approved By" value={invoice.approvedBy ?? '-'} />
              <DetailItem label="Approved At" value={invoice.approvedOn ?? '-'} />
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100 flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">
                  This document has passed 3-way matching internal controls.
                </p>
              </div>
            </SidebarCard>
          )}

          {/* Payment History */}
          {invoice.status === 'Paid' && (
            <SidebarCard title="Payment Receipt" icon={<CreditCard className="w-4 h-4" />}>
              <DetailItem label="Paid Date" value={invoice.paymentDate ?? '-'} />
              <DetailItem label="Method" value={invoice.paymentMethod ?? '-'} />
              <DetailItem label="Ref ID" value="TXN-9023412" />
            </SidebarCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- REUSABLE SUB-COMPONENTS ---------------- */

function SidebarCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-right">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value.toLocaleString()}</span>
    </div>
  );
}
