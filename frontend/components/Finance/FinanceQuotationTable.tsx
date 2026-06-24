'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Loader2, CheckCircle, XCircle, Eye, Search, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBranchInvoices, getInvoiceById, financeRejectInvoice, Invoice } from '@/lib/invoice';
import { ApproveQuotationDialog } from '../invoice/ApproveQuotationDialog';

import { formatCurrency } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import StatCard from '@/components/StatCard';
import { QuotationViewDialog } from '../employeeComponents/QuotationViewDialog';

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
    EMPLOYEE_APPROVED: 'bg-blue-50 text-blue-600 border-blue-200',
    FINANCE_APPROVED: 'bg-green-50 text-green-700 border-green-200',
    FINANCE_REJECTED: 'bg-red-50 text-red-700 border-red-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    VALIDITY_EXTENSION_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
    WAITING_FINANCE_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ACTIVE_CONTRACT: 'bg-green-50 text-green-700 border-green-200',
    ACTIVE_LEASE: 'bg-green-50 text-green-700 border-green-200',
    INVOICED: 'bg-blue-50 text-blue-600 border-blue-200',
    PAID: 'bg-green-50 text-green-700 border-green-200',
    EXPIRED: 'bg-red-50 text-red-700 border-red-200',
    CUSTOMER_ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
    CUSTOMER_REJECTED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-slate-50 text-slate-600 border-slate-200',
    CREDIT_EXCHANGE: 'bg-purple-50 text-purple-700 border-purple-200',
    PRODUCT_REPLACED: 'bg-purple-50 text-purple-700 border-purple-200',
    CREDIT_RETURN: 'bg-purple-50 text-purple-700 border-purple-200',
    CASH_REFUND: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label: Record<string, string> = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    SENT_TO_CUSTOMER: 'SENT',
    EMPLOYEE_APPROVED: 'PENDING REVIEW',
    FINANCE_APPROVED: 'APPROVED',
    FINANCE_REJECTED: 'REJECTED',
    CUSTOMER_ACCEPTED: 'ACCEPTED',
    CUSTOMER_REJECTED: 'REJECTED',
    ACCEPTED: 'APPROVED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING_CONFIRMATION: 'ALLOCATION PENDING',
    PAID: 'PAID',
    ACTIVE_LEASE: 'ACTIVE',
    ACTIVE_CONTRACT: 'ACTIVE',
    INVOICED: 'INVOICED',
    TRANSACTION_COMPLETED: 'PENDING REVIEW',
    VALIDITY_EXTENSION_REQUESTED: 'EXTENSION REQ.',
    WAITING_FINANCE_APPROVAL: 'PENDING FINANCE',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
    CREDIT_EXCHANGE: 'CREDIT RETURN',
    PRODUCT_REPLACED: 'REPLACED',
    CREDIT_RETURN: 'CREDIT RETURN',
    CASH_REFUND: 'CASH REFUND',
  };
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase shadow-none border ${map[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
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
    PRODUCT_SALE: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    SPAREPART_SALE: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  };
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wider ${map[type] ?? ''}`}
    >
      {type}
    </Badge>
  );
}

// ─── Main Finance Quotation Table ─────────────────────────────────────────────

export default function FinanceQuotationTable({
  saleType,
  hideActions = false,
}: {
  saleType?: string;
  hideActions?: boolean;
}) {
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewQuotation, setViewQuotation] = useState<Invoice | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Invoice | null>(null);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  // Track IDs we've already notified about so we don't repeat
  const notifiedIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const fetchQuotations = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const data = await getBranchInvoices();
        let onlyQuotations = data.filter(
          (inv) => inv.type === 'QUOTATION' || inv.type === 'PROFORMA' || inv.type === 'FINAL',
        );
        if (saleType) {
          onlyQuotations = onlyQuotations.filter((inv) => {
            const type = inv.saleType?.toString().toUpperCase();
            const target = saleType.toUpperCase();
            if (target === 'SALE') {
              return ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(type || '');
            }
            return type === target;
          });
        }

        // Browser notifications for newly pending quotations
        if (!isFirstLoad.current) {
          const newPending = onlyQuotations.filter(
            (q) => q.status === 'EMPLOYEE_APPROVED' && !notifiedIds.current.has(q.id),
          );
          newPending.forEach((q) => {
            notifiedIds.current.add(q.id);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('📋 New Quotation for Review', {
                body: `${q.invoiceNumber} from ${q.employeeName || 'an employee'} — QAR ${Number(q.totalAmount || 0).toLocaleString()}`,
                icon: '/favicon.ico',
              });
            }
          });
        } else {
          // Seed known IDs on first load so we don't re-notify stale items
          onlyQuotations
            .filter((q) => q.status === 'EMPLOYEE_APPROVED')
            .forEach((q) => notifiedIds.current.add(q.id));
          isFirstLoad.current = false;
        }

        setQuotations(onlyQuotations);
      } catch (error) {
        console.error(error);
        if (!silent) toast.error('Failed to load quotations.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [saleType],
  );

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initial fetch + poll every 30 s
  useEffect(() => {
    fetchQuotations();
    const interval = setInterval(() => fetchQuotations(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchQuotations]);

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  // Stats
  const pending = quotations.filter(
    (q) =>
      q.status === 'EMPLOYEE_APPROVED' ||
      q.status === 'PENDING' ||
      q.status === 'VALIDITY_EXTENSION_REQUESTED' ||
      q.status === 'WAITING_FINANCE_APPROVAL',
  ).length;
  const approved = quotations.filter(
    (q) =>
      q.type === 'PROFORMA' ||
      q.type === 'FINAL' ||
      [
        'APPROVED',
        'FINANCE_APPROVED',
        'ACCEPTED',
        'CUSTOMER_ACCEPTED',
        'SENT_TO_CUSTOMER',
        'PAID',
        'ACTIVE_LEASE',
        'ACTIVE_CONTRACT',
        'ISSUED',
        'INVOICED',
        'TRANSACTION_COMPLETED',
        'PENDING_CONFIRMATION',
      ].includes(q.status),
  ).length;
  const rejected = quotations.filter(
    (q) =>
      q.status === 'REJECTED' ||
      q.status === 'FINANCE_REJECTED' ||
      q.status === 'CUSTOMER_REJECTED',
  ).length;

  // ── Product name helpers ───────────────────────────────────────────────
  const getCleanProductName = (name: string) => {
    let clean = name.replace(/^(Black & White - |Color - |Combined - )/i, '');
    clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\)|\s*\(Serial[^)]+\))/gi, '');
    const lastDashIndex = clean.lastIndexOf(' - ');
    if (lastDashIndex !== -1 && clean.length - lastDashIndex < 25) {
      clean = clean.substring(0, lastDashIndex).trim();
    }
    return clean.trim();
  };

  const getProductNames = (invoice: Invoice) => {
    const completedExchange = invoice.creditNotes?.find(
      (cn) => cn.status === 'PRODUCT_REPLACED' && cn.type === 'CREDIT_EXCHANGE',
    );
    if (completedExchange?.replacementProductName) {
      return completedExchange.replacementProductName;
    }

    if (!invoice.items || invoice.items.length === 0) return '';
    const productItems = invoice.items.filter(
      (item) => item.itemType !== 'PRICING_RULE' && item.description,
    );
    if (productItems.length === 0) {
      const allWithDesc = invoice.items.filter((item) => item.description);
      if (allWithDesc.length === 0) return '';
      return allWithDesc.map((item) => getCleanProductName(item.description)).join(', ');
    }
    return productItems.map((item) => getCleanProductName(item.description)).join(', ');
  };

  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.invoiceNumber?.toLowerCase().includes(s) ||
      q.invoiceNumber?.toLowerCase().replace(/^inv-/i, 'qtn-').includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      q.employeeName?.toLowerCase().includes(s) ||
      q.saleType?.toLowerCase().includes(s) ||
      getProductNames(q).toLowerCase().includes(s)
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

  const handleApprove = (inv: Invoice) => {
    setApproveTarget(inv);
    setApproveOpen(true);
  };

  const handleApproveSuccess = () => {
    setApproveOpen(false);
    setApproveTarget(null);
    fetchQuotations();
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
      <div
        className="flex flex-col items-center justify-center h-64 space-y-4"
        suppressHydrationWarning
      >
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
            placeholder="Search by number, customer, product, employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&_[data-slot=table-container]]:scrollbar-none [&_[data-slot=table-container]::-webkit-scrollbar]:hidden [&_[data-slot=table-container]]:[-ms-overflow-style:none] [&_[data-slot=table-container]]:[scrollbar-width:none]">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[11%] py-3 px-3">
                  QT NUMBER
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[18%] py-3 px-3">
                  PRODUCT
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[9%] py-3 px-3">
                  CUSTOMER
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[9%] py-3 px-3">
                  TYPE
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[9%] py-3 px-3">
                  AMOUNT
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[12%] py-3 px-3">
                  CREATED BY
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[14%] py-3 px-3">
                  STATUS
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase w-[9%] py-3 px-3">
                  DATE
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase text-center w-[9%] py-3 px-3">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-14 text-muted-foreground">
                    <FilePlus2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((q, index) => {
                  const isPending =
                    q.status === 'EMPLOYEE_APPROVED' ||
                    q.status === 'TRANSACTION_COMPLETED' ||
                    q.status === 'VALIDITY_EXTENSION_REQUESTED' ||
                    q.status === 'WAITING_FINANCE_APPROVAL';
                  return (
                    <TableRow
                      key={q.id}
                      className={`${isPending ? 'bg-blue-50/20 hover:bg-blue-50/40' : index % 2 ? 'bg-slate-50/10' : 'bg-card'} hover:bg-slate-50/50 transition-colors border-b border-slate-100/50`}
                    >
                      <TableCell className="py-3 px-3">
                        <div
                          className={`${q.creditNotes?.some((cn) => cn.status === 'PRODUCT_REPLACED') ? 'text-rose-500' : 'text-blue-500'} font-semibold tracking-tight truncate text-xs`}
                          title={(() => {
                            const cn = q.creditNotes?.find((c) => c.status === 'PRODUCT_REPLACED');
                            if (cn) {
                              const match = cn.creditNoteNo?.match(/(\d+)$/);
                              const num = match ? parseInt(match[1], 10) : 0;
                              return `RTN-INV-${String(num).padStart(4, '0')}`;
                            }
                            return q.invoiceNumber?.replace(/^INV-/i, 'QTN-');
                          })()}
                        >
                          {(() => {
                            const cn = q.creditNotes?.find((c) => c.status === 'PRODUCT_REPLACED');
                            if (cn) {
                              const match = cn.creditNoteNo?.match(/(\d+)$/);
                              const num = match ? parseInt(match[1], 10) : 0;
                              return `RTN-INV-${String(num).padStart(4, '0')}`;
                            }
                            return q.invoiceNumber?.replace(/^INV-/i, 'QTN-');
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div
                          className="font-semibold text-slate-700 truncate text-xs"
                          title={getProductNames(q)}
                        >
                          {getProductNames(q) || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div
                          className="font-bold text-slate-700 truncate text-xs"
                          title={q.customerName || 'Walk-in'}
                        >
                          {q.customerName || 'Walk-in'}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <TypeBadge type={q.saleType} />
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="font-semibold text-foreground truncate text-xs">
                          {(() => {
                            const completedExchange = q.creditNotes?.find(
                              (cn) =>
                                cn.status === 'PRODUCT_REPLACED' && cn.type === 'CREDIT_EXCHANGE',
                            );
                            if (
                              completedExchange &&
                              Number(completedExchange.replacementAmount) > 0
                            ) {
                              return (
                                <div>
                                  <div className="text-violet-700">
                                    {formatCurrency(Number(completedExchange.replacementAmount))}
                                  </div>
                                  <div className="text-[9px] text-slate-400 line-through">
                                    {formatCurrency(q.totalAmount)}
                                  </div>
                                </div>
                              );
                            }
                            return formatCurrency(q.totalAmount);
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div
                          className="text-slate-600 truncate text-xs"
                          title={q.employeeName || '—'}
                        >
                          {q.employeeName || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        {(() => {
                          const cn = q.creditNotes?.find((c) => c.status === 'PRODUCT_REPLACED');
                          if (cn) {
                            let s = 'PRODUCT_REPLACED';
                            if (cn.type === 'DIRECT_REFUND') s = 'CASH_REFUND';
                            else if (cn.type === 'CREDIT_EXCHANGE') s = 'CREDIT_EXCHANGE';
                            return <StatusBadge status={s} />;
                          }
                          return <StatusBadge status={q.status} />;
                        })()}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="text-muted-foreground font-medium truncate text-xs">
                          {new Date(q.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="View Details"
                            onClick={() => handleView(q.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Inline approve/reject only if pending and not hidden */}
                          {isPending && !hideActions && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                                onClick={() => handleApprove(q)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg"
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

      {/* View dialog — finance gets approve/reject + send-to-customer */}
      {viewQuotation && (
        <QuotationViewDialog
          quotation={viewQuotation}
          onClose={() => setViewQuotation(null)}
          showDistribution={true}
          onApprove={
            viewQuotation.status === 'EMPLOYEE_APPROVED' ||
            viewQuotation.status === 'VALIDITY_EXTENSION_REQUESTED' ||
            viewQuotation.status === 'WAITING_FINANCE_APPROVAL'
              ? () => {
                  handleApprove(viewQuotation);
                  setViewQuotation(null);
                }
              : undefined
          }
          onReject={
            viewQuotation.status === 'EMPLOYEE_APPROVED' ||
            viewQuotation.status === 'VALIDITY_EXTENSION_REQUESTED' ||
            viewQuotation.status === 'WAITING_FINANCE_APPROVAL'
              ? () => {
                  openReject(viewQuotation);
                }
              : undefined
          }
          onStatusChange={async () => {
            try {
              const refreshed = await getInvoiceById(viewQuotation.id);
              setViewQuotation(refreshed);
            } catch {
              // silent
            }
            fetchQuotations(true);
          }}
          onConvertSuccess={() => {
            setViewQuotation(null);
            fetchQuotations();
          }}
        />
      )}

      {/* Reject dialog */}
      {rejectOpen && (
        <Dialog open onOpenChange={(v) => !v && setRejectOpen(false)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Reject Quotation</DialogTitle>
              <DialogDescription>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="gap-2"
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

      {/* Approve dialog */}
      {approveOpen && approveTarget && (
        <ApproveQuotationDialog
          invoiceId={approveTarget.id}
          quotation={approveTarget}
          onClose={() => setApproveOpen(false)}
          onSuccess={handleApproveSuccess}
        />
      )}
    </div>
  );
}
