'use client';

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, Eye, Search, FilePlus2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBranchInvoices,
  getInvoiceById,
  financeRejectInvoice,
  allocateMachinesInvoice,
  Invoice,
} from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import StatCard from '@/components/StatCard';

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    EMPLOYEE_APPROVED: 'bg-blue-100 text-blue-600',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };
  const label: Record<string, string> = {
    EMPLOYEE_APPROVED: 'PENDING REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DRAFT: 'DRAFT',
  };
  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none ${map[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {label[status] ?? status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    SALE: 'bg-blue-50 text-blue-600 border-blue-200',
    RENT: 'bg-orange-50 text-orange-600 border-orange-200',
    LEASE: 'bg-purple-50 text-purple-600 border-purple-200',
  };
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider ${map[type] ?? ''}`}
    >
      {type}
    </Badge>
  );
}

// ─── View Dialog ──────────────────────────────────────────────────────────────

function QuotationViewDialog({
  quotation,
  onClose,
  onApprove,
  onReject,
}: {
  quotation: Invoice;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canAction = quotation.status === 'EMPLOYEE_APPROVED';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-card border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {quotation.invoiceNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  Quotation Details — Finance Review
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge type={quotation.saleType} />
              <StatusBadge status={quotation.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-card/50 space-y-5 overflow-y-auto max-h-[58vh]">
          {/* Common */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Customer" value={quotation.customerName || 'Walk-in'} />
            <InfoRow label="Created By" value={quotation.employeeName || 'Unknown'} />
            <InfoRow
              label="Date"
              value={new Date(quotation.createdAt).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            />
            {quotation.effectiveFrom && (
              <InfoRow
                label="Effective From"
                value={new Date(quotation.effectiveFrom).toLocaleDateString()}
              />
            )}
            {quotation.effectiveTo && (
              <InfoRow
                label="Effective To"
                value={new Date(quotation.effectiveTo).toLocaleDateString()}
              />
            )}
          </div>

          {/* RENT details */}
          {quotation.saleType === 'RENT' && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                Rent Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {quotation.rentType && (
                  <InfoRow label="Rent Type" value={quotation.rentType.replace(/_/g, ' ')} />
                )}
                {quotation.rentPeriod && (
                  <InfoRow label="Billing Period" value={quotation.rentPeriod} />
                )}
                {quotation.monthlyRent != null && (
                  <InfoRow label="Monthly Rent" value={formatCurrency(quotation.monthlyRent)} />
                )}
                {quotation.advanceAmount != null && (
                  <InfoRow label="Advance" value={formatCurrency(quotation.advanceAmount)} />
                )}
                {quotation.discountPercent != null && (
                  <InfoRow label="Discount" value={`${quotation.discountPercent}%`} />
                )}
              </div>
            </div>
          )}

          {/* LEASE details */}
          {quotation.saleType === 'LEASE' && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                Lease Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {quotation.leaseType && <InfoRow label="Lease Type" value={quotation.leaseType} />}
                {quotation.leaseTenureMonths != null && (
                  <InfoRow label="Tenure" value={`${quotation.leaseTenureMonths} months`} />
                )}
                {quotation.totalLeaseAmount != null && (
                  <InfoRow
                    label="Total Amount"
                    value={formatCurrency(quotation.totalLeaseAmount)}
                  />
                )}
                {quotation.monthlyEmiAmount != null && (
                  <InfoRow label="Monthly EMI" value={formatCurrency(quotation.monthlyEmiAmount)} />
                )}
              </div>
            </div>
          )}

          {/* Items */}
          {quotation.items && quotation.items.length > 0 && (
            <div className="bg-card rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-muted/30 border-b border-slate-100">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {quotation.saleType === 'SALE' ? 'Sale Items' : 'Machine Models'}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                      Description
                    </th>
                    <th className="text-center px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                      Qty
                    </th>
                    {quotation.saleType === 'SALE' && (
                      <>
                        <th className="text-right px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                          Unit Price
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                          Total
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                      {quotation.saleType === 'SALE' && (
                        <>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(item.unitPrice ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCurrency((item.quantity ?? 1) * (item.unitPrice ?? 0))}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotation.saleType === 'SALE' && (
                <div className="px-4 py-4 flex justify-end border-t border-slate-100 bg-card">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
                    <p className="text-2xl font-black text-primary">
                      {formatCurrency(quotation.totalAmount)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-card flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">
            Close
          </Button>
          {canAction && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 gap-2"
                onClick={onReject}
              >
                <XCircle size={15} /> Reject
              </Button>
              <Button
                className="rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md"
                onClick={onApprove}
              >
                <CheckCircle size={15} /> Approve
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

// ─── Main Finance Quotation Table ─────────────────────────────────────────────

export default function FinanceQuotationTable() {
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewQuotation, setViewQuotation] = useState<Invoice | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await getBranchInvoices();
      // Show employee-approved quotations (type === QUOTATION) needing finance review
      // + already reviewed (APPROVED / REJECTED) for visibility
      const onlyQuotations = data.filter((inv) => inv.type === 'QUOTATION');
      setQuotations(onlyQuotations);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  // Stats
  const pending = quotations.filter((q) => q.status === 'EMPLOYEE_APPROVED').length;
  const approved = quotations.filter((q) => q.status === 'APPROVED').length;
  const rejected = quotations.filter((q) => q.status === 'REJECTED').length;

  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.invoiceNumber?.toLowerCase().includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      q.employeeName?.toLowerCase().includes(s) ||
      q.saleType?.toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleView = async (id: string) => {
    try {
      const data = await getInvoiceById(id);
      setViewQuotation(data);
    } catch {
      toast.error('Failed to load quotation.');
    }
  };

  const handleApprove = async (inv: Invoice) => {
    setActionLoading(true);
    try {
      await allocateMachinesInvoice(inv.id, {});
      toast.success('Quotation approved successfully!');
      setViewQuotation(null);
      fetchQuotations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await financeRejectInvoice(rejectTarget.id, rejectReason);
      toast.success('Quotation rejected.');
      setRejectOpen(false);
      setRejectReason('');
      setRejectTarget(null);
      setViewQuotation(null);
      fetchQuotations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reject quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (inv: Invoice) => {
    setRejectTarget(inv);
    setRejectReason('');
    setRejectOpen(true);
    setViewQuotation(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading quotations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Pending Review"
          value={String(pending)}
          subtitle="Awaiting finance action"
        />
        <StatCard title="Approved" value={String(approved)} subtitle="Finance approved" />
        <StatCard title="Rejected" value={String(rejected)} subtitle="Finance rejected" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Quotation Review</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve or reject employee quotations
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-bold text-blue-700">{pending} pending review</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by number, customer, employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-primary font-bold">QT NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">CREATED BY</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-14 text-muted-foreground">
                    <FilePlus2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((q, index) => {
                  const isPending = q.status === 'EMPLOYEE_APPROVED';
                  return (
                    <TableRow
                      key={q.id}
                      className={`${isPending ? 'bg-blue-50/30 hover:bg-blue-50/50' : index % 2 ? 'bg-slate-50/30' : 'bg-card'} hover:bg-muted/40 transition-colors`}
                    >
                      <TableCell className="text-blue-500 font-bold tracking-tight">
                        {q.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">
                        {q.customerName || 'Walk-in'}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={q.saleType} />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(q.totalAmount)}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {q.employeeName || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={q.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-medium">
                        {new Date(q.createdAt).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50"
                            title="View Details"
                            onClick={() => handleView(q.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Inline approve/reject only if pending */}
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                title="Approve"
                                onClick={() => handleApprove(q)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                                title="Reject"
                                onClick={() => openReject(q)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* View dialog */}
      {viewQuotation && (
        <QuotationViewDialog
          quotation={viewQuotation}
          onClose={() => setViewQuotation(null)}
          onApprove={() => handleApprove(viewQuotation)}
          onReject={() => openReject(viewQuotation)}
        />
      )}

      {/* Reject dialog */}
      {rejectOpen && (
        <Dialog open onOpenChange={(v) => !v && setRejectOpen(false)}>
          <DialogContent className="rounded-2xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                Reject Quotation
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400">
                Please provide a reason for rejecting this quotation. It will be sent back to the
                employee.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRejectReason(e.target.value)
                }
                className="min-h-[100px] resize-none rounded-xl"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectOpen(false)}
                className="rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="rounded-xl font-bold gap-2"
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
