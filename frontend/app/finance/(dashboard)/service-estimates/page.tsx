'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, CheckCircle, XCircle, Search, ClipboardList, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingServiceEstimates,
  financeApproveQuotation,
  financeRejectInvoice,
  Invoice,
} from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';

export default function FinanceServiceEstimatesPage() {
  const [estimates, setEstimates] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Rejection state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Detail view state
  const [detailTarget, setDetailTarget] = useState<Invoice | null>(null);

  const fetchEstimates = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getPendingServiceEstimates();
      setEstimates(data || []);
    } catch (error) {
      console.error(error);
      if (!silent) toast.error('Failed to load service estimates.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
    const interval = setInterval(() => fetchEstimates(true), 30000);
    return () => clearInterval(interval);
  }, [fetchEstimates]);

  const handleApprove = async (inv: Invoice) => {
    setActionLoading(true);
    try {
      await financeApproveQuotation(inv.id);
      toast.success(`Service estimate ${inv.invoiceNumber} approved successfully.`);
      fetchEstimates();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve estimate.');
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (inv: Invoice) => {
    setRejectTarget(inv);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await financeRejectInvoice(rejectTarget.id, rejectReason);
      toast.success(`Service estimate ${rejectTarget.invoiceNumber} rejected.`);
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      fetchEstimates();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reject estimate.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = estimates.filter((e) => {
    const query = search.toLowerCase();
    return (
      e.invoiceNumber?.toLowerCase().includes(query) ||
      e.customerName?.toLowerCase().includes(query) ||
      e.employeeName?.toLowerCase().includes(query) ||
      (e.serviceTicketId && e.serviceTicketId.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading pending service estimates...</p>
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pending Service Estimates"
          value={String(estimates.length)}
          subtitle="Waiting for Finance approval"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Service Estimates Review</h2>
          <p className="text-sm text-muted-foreground">
            Approve or reject service quotations from technicians
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by number, customer, ticket, technician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  ESTIMATE NUMBER
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  TICKET ID
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  CUSTOMER
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  TECHNICIAN
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  TOTAL AMOUNT
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  DATE
                </TableHead>
                <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase text-center">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No pending service estimates found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-blue-600 text-xs font-mono">
                      {e.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-mono">
                      {e.serviceTicketId ? e.serviceTicketId.substring(0, 8) + '...' : '—'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 text-xs">
                      {e.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {e.employeeName || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs">
                      {formatCurrency(e.totalAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 rounded-lg"
                          title="View Details"
                          onClick={() => setDetailTarget(e)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Approve"
                          onClick={() => handleApprove(e)}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Reject"
                          onClick={() => openReject(e)}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail View Dialog */}
      {detailTarget && (
        <Dialog open onOpenChange={(v) => !v && setDetailTarget(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-4">
                <span>Estimate Details</span>
                <span className="font-mono text-sm text-blue-600">
                  {detailTarget.invoiceNumber}
                </span>
              </DialogTitle>
              <DialogDescription>
                Review details, items, labor costs and parts included in this estimate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Customer:</span>
                  <span className="font-bold text-slate-800">
                    {detailTarget.customerName || 'Walk-in'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Technician:</span>
                  <span className="font-bold text-slate-800">
                    {detailTarget.employeeName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Service Ticket ID:</span>
                  <span className="font-mono text-slate-800">
                    {detailTarget.serviceTicketId || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date Created:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(detailTarget.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden mt-4">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Item / Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailTarget.items && detailTarget.items.length > 0 ? (
                      detailTarget.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {item.itemType || 'Product'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency((item.unitPrice || 0) * (item.quantity || 0))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                          No items in this estimate.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pr-4 pt-2">
                <div className="text-right space-y-1">
                  <span className="text-xs text-muted-foreground block">Grand Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(detailTarget.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDetailTarget(null)}>
                Close
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                onClick={() => {
                  handleApprove(detailTarget);
                  setDetailTarget(null);
                }}
                disabled={actionLoading}
              >
                <CheckCircle size={14} /> Approve
              </Button>
              <Button
                variant="destructive"
                className="gap-1.5"
                onClick={() => {
                  openReject(detailTarget);
                  setDetailTarget(null);
                }}
                disabled={actionLoading}
              >
                <XCircle size={14} /> Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject dialog */}
      {rejectOpen && rejectTarget && (
        <Dialog open onOpenChange={(v) => !v && setRejectOpen(false)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Reject Service Estimate</DialogTitle>
              <DialogDescription>
                Provide the reason for rejecting service estimate {rejectTarget.invoiceNumber}. It
                will be routed back to the technician as DIAGNOSED.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px] resize-none rounded-xl"
              />
            </div>
            <DialogFooter suppressHydrationWarning>
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
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
