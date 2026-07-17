'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceById, getAuditLogs, Invoice, AuditLog } from '@/lib/invoice';
import { getEmployeeById } from '@/lib/employee';
import { getUserFromToken } from '@/lib/auth';
import { getActiveCurrency } from '@/lib/currency';
import { getApiErrorMessage } from '@/lib/apiError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Clock,
  DollarSign,
  Package,
} from 'lucide-react';

const fmtDate = (d?: string | null, withTime = false) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return format(date, withTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy');
};

const statusBadgeClass = (status: string) => {
  if (/APPROVED|ACTIVE|ACCEPTED|COMPLETED/.test(status))
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/REJECTED|CANCELLED|EXPIRED/.test(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const eventIcon = (action: string) => {
  if (action === 'CREATED') return { Icon: PlusCircle, color: 'text-blue-600 bg-blue-50' };
  if (action.includes('REJECTED')) return { Icon: XCircle, color: 'text-rose-600 bg-rose-50' };
  if (action.includes('APPROVED'))
    return { Icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' };
  return { Icon: Activity, color: 'text-slate-500 bg-slate-50' };
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const currentUser = getUserFromToken();
  const canViewLogs = currentUser && ['MANAGER', 'FINANCE', 'ADMIN'].includes(currentUser.role);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await getInvoiceById(invoiceId);
      setInvoice(inv);

      if (canViewLogs) {
        try {
          const auditLogs = await getAuditLogs(invoiceId);
          const sorted = (auditLogs || []).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setLogs(sorted);

          // Best-effort: resolve performer UUIDs to employee names
          const ids = [
            ...new Set(
              sorted.map((l) => l.performedBy).filter((v) => /^[0-9a-f-]{36}$/i.test(v || '')),
            ),
          ];
          const entries = await Promise.all(
            ids.map(async (id) => {
              try {
                const res = await getEmployeeById(id);
                const emp = res?.data;
                const name = emp
                  ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email
                  : null;
                return [id, name] as const;
              } catch {
                return [id, null] as const;
              }
            }),
          );
          setNames(Object.fromEntries(entries.filter(([, name]) => !!name) as [string, string][]));
        } catch {
          setLogs([]);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load invoice details.', { description: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 animate-pulse">
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <p className="text-sm text-slate-500">Invoice not found.</p>
      </div>
    );
  }

  const currency = getActiveCurrency();
  const performerName = (id: string) => names[id] || id;
  const subTotal =
    Number(invoice.totalAmount || 0) - Number(invoice.taxAmount || 0) >= 0
      ? Number(invoice.totalAmount || 0) - Number(invoice.taxAmount || 0)
      : Number(invoice.totalAmount || 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-8 text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {invoice.invoiceNumber || 'Invoice'}
          </h1>
          {invoice.type && (
            <Badge variant="outline" className="text-[10px] font-bold">
              {invoice.type}
            </Badge>
          )}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeClass(invoice.status)}`}
          >
            {invoice.status.replaceAll('_', ' ')}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {invoice.saleType} · Created {fmtDate(invoice.createdAt, true)}
        </span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Total Amount
            </span>
            <span className="text-lg font-bold text-slate-800">
              {currency} {Number(invoice.totalAmount || 0).toFixed(2)}
            </span>
            {invoice.taxAmount != null && Number(invoice.taxAmount) > 0 && (
              <span className="block text-[10px] text-slate-400">
                incl. {invoice.taxName || 'tax'} {currency} {Number(invoice.taxAmount).toFixed(2)}
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Subtotal</span>
            <span className="text-lg font-bold text-slate-800">
              {currency} {subTotal.toFixed(2)}
            </span>
            {(invoice.discountAmount || 0) > 0 && (
              <span className="block text-[10px] text-slate-400">
                discount {currency} {Number(invoice.discountAmount).toFixed(2)}
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Branch</span>
            <span className="text-sm font-bold text-slate-800">{invoice.branchName || '—'}</span>
            <span className="block text-[10px] text-slate-400">
              by {invoice.employeeName || '—'}
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Validity</span>
            <span className="text-sm font-bold text-slate-800">
              {invoice.effectiveFrom || invoice.startDate
                ? `${fmtDate(invoice.effectiveFrom || invoice.startDate)} → ${fmtDate(invoice.effectiveTo || invoice.endDate)}`
                : invoice.validityDays
                  ? `${invoice.validityDays} days`
                  : '—'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Customer + contract info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className="font-bold text-sm text-slate-800">{invoice.customerName || 'Unknown'}</p>
            {invoice.customerEmail && <p className="text-slate-500">{invoice.customerEmail}</p>}
            {invoice.customerPhone && <p className="text-slate-500">{invoice.customerPhone}</p>}
            {invoice.customerAddress && <p className="text-slate-400">{invoice.customerAddress}</p>}
            {invoice.customerTrn && <p className="text-slate-400">TRN: {invoice.customerTrn}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" /> Deal Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 text-slate-600">
            <p>
              Sale type: <span className="font-semibold">{invoice.saleType}</span>
              {invoice.rentType && (
                <>
                  {' '}
                  · Rent: {invoice.rentType} ({invoice.rentPeriod})
                </>
              )}
              {invoice.leaseType && (
                <>
                  {' '}
                  · Lease: {invoice.leaseType}, {invoice.leaseTenureMonths} months
                </>
              )}
            </p>
            {(invoice.monthlyRent || 0) > 0 && (
              <p>
                Monthly rent:{' '}
                <span className="font-semibold">
                  {currency} {Number(invoice.monthlyRent).toFixed(2)}
                </span>
              </p>
            )}
            {(invoice.monthlyEmiAmount || 0) > 0 && (
              <p>
                Monthly EMI:{' '}
                <span className="font-semibold">
                  {currency} {Number(invoice.monthlyEmiAmount).toFixed(2)}
                </span>
              </p>
            )}
            {(invoice.securityDepositAmount || 0) > 0 && (
              <p>
                Security deposit:{' '}
                <span className="font-semibold">
                  {currency} {Number(invoice.securityDepositAmount).toFixed(2)}
                </span>{' '}
                ({invoice.securityDepositMode || 'N/A'})
              </p>
            )}
            {invoice.warrantyType && invoice.warrantyType !== 'none' && (
              <p>
                Warranty: <span className="font-semibold">{invoice.warrantyType}</span>
                {invoice.warrantyDurationValue &&
                  ` · ${invoice.warrantyDurationValue} ${invoice.warrantyDurationUnit || ''}`}
                {invoice.warrantyCopyLimit &&
                  ` · ${Number(invoice.warrantyCopyLimit).toLocaleString()} copies`}
              </p>
            )}
            {invoice.notes && <p className="text-slate-400 pt-1">Notes: {invoice.notes}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="shadow-sm border-slate-200/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-blue-600" /> Line Items (
            {invoice.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!invoice.items || invoice.items.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No line items.</p>
          ) : (
            <div className="border border-slate-100 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-slate-500">#</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">
                      Description
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500">Serial</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Qty
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Discount
                    </TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={item.id || idx}>
                      <TableCell className="text-xs text-slate-500 py-2">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 py-2">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 py-2">
                        {item.serialNumber || item.sn || item.sku || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {item.quantity ?? 1}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {item.unitPrice != null
                          ? `${currency} ${Number(item.unitPrice).toFixed(2)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-2">
                        {item.discountAmount || item.discount
                          ? `${currency} ${Number(item.discountAmount || item.discount).toFixed(2)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-slate-800 py-2">
                        {item.totalAmount != null
                          ? `${currency} ${Number(item.totalAmount).toFixed(2)}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity history */}
      {canViewLogs && (
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-600" /> Activity History ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No activity recorded.</p>
            ) : (
              <div className="relative pl-8 space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {logs.map((log) => {
                  const { Icon, color } = eventIcon(log.action);
                  return (
                    <div key={log.id || log.action} className="relative">
                      <div
                        className={`absolute -left-8 top-0 p-1.5 rounded-full border border-slate-100 shadow-sm ${color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-extrabold text-slate-800">
                          {log.action.replaceAll('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmtDate(log.createdAt, true)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{log.details || log.action}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" /> By: {performerName(log.performedBy)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Approval snapshot */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-500">
              <p className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" />
                Finance:{' '}
                {invoice.financeApprovedAt
                  ? `approved ${fmtDate(invoice.financeApprovedAt, true)}`
                  : invoice.status === 'FINANCE_REJECTED'
                    ? 'rejected'
                    : 'no action yet'}
                {invoice.financeRemarks && ` — "${invoice.financeRemarks}"`}
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Employee approval:{' '}
                {invoice.employeeApprovedAt
                  ? `approved ${fmtDate(invoice.employeeApprovedAt, true)}`
                  : 'no action yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
