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
import { Loader2, CheckCircle, XCircle, Search, ClipboardList, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingServiceEstimates,
  getApprovedServiceEstimates,
  financeApproveQuotation,
  financeRejectInvoice,
  Invoice,
} from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { getServiceTicketById, ServiceTicket } from '@/lib/serviceTicket';
import SendDocumentModal from '@/components/SendDocumentModal';

export default function FinanceServiceEstimatesPage() {
  const currency = useBranchCurrency();
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
  const [ticketDetails, setTicketDetails] = useState<ServiceTicket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Approved estimates — ready to be sent to the customer
  const [approvedEstimates, setApprovedEstimates] = useState<Invoice[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTicket, setShareTicket] = useState<ServiceTicket | null>(null);
  const [shareCustomer, setShareCustomer] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({ name: 'Customer', email: '', phone: '' });

  const fetchEstimates = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [pending, approved] = await Promise.all([
        getPendingServiceEstimates(),
        getApprovedServiceEstimates().catch(() => []),
      ]);
      setEstimates(pending || []);
      setApprovedEstimates(
        (approved || []).filter(
          (inv) => inv.billType === 'SERVICE' && inv.status === 'FINANCE_APPROVED',
        ),
      );
    } catch (error) {
      console.error(error);
      if (!silent) toast.error('Failed to load service estimates.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const openShare = async (inv: Invoice) => {
    if (!inv.serviceTicketId) {
      toast.error('This estimate has no linked service ticket.');
      return;
    }
    try {
      const ticket = await getServiceTicketById(inv.serviceTicketId);
      setShareTicket(ticket);
      setShareCustomer({
        name: inv.customerName || 'Customer',
        email: inv.customerEmail || '',
        phone: inv.customerPhone || '',
      });
      setShareOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load the service ticket for sending.');
    }
  };

  useEffect(() => {
    fetchEstimates();
    const interval = setInterval(() => fetchEstimates(true), 30000);
    return () => clearInterval(interval);
  }, [fetchEstimates]);

  useEffect(() => {
    if (detailTarget?.serviceTicketId) {
      setLoadingTicket(true);
      getServiceTicketById(detailTarget.serviceTicketId)
        .then((ticket) => {
          setTicketDetails(ticket);
        })
        .catch((err) => {
          console.error('Failed to fetch service ticket:', err);
          toast.error('Failed to load service ticket details.');
        })
        .finally(() => {
          setLoadingTicket(false);
        });
    } else {
      setTicketDetails(null);
    }
  }, [detailTarget]);

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
    const matchesSearch =
      e.invoiceNumber?.toLowerCase().includes(query) ||
      e.customerName?.toLowerCase().includes(query) ||
      e.employeeName?.toLowerCase().includes(query) ||
      (e.serviceTicketId && e.serviceTicketId.toLowerCase().includes(query));
    return e.billType === 'SERVICE' && e.status === 'WAITING_FINANCE_APPROVAL' && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading pending service estimates...</p>
      </div>
    );
  }

  const pendingCount = estimates.filter(
    (e) => e.billType === 'SERVICE' && e.status === 'WAITING_FINANCE_APPROVAL',
  ).length;

  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pending Service Estimates"
          value={String(pendingCount)}
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
                      {formatCurrency(e.totalAmount, currency)}
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

      {/* Approved estimates — ready to send to the customer */}
      {approvedEstimates.length > 0 && (
        <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-emerald-100">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Approved — Ready to Send</h3>
              <p className="text-xs text-muted-foreground">
                Finance-approved estimates waiting to be shared with the customer.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto p-2">
            <Table className="w-full">
              <TableHeader className="bg-emerald-50/40 border-b border-emerald-100">
                <TableRow>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                    ESTIMATE NUMBER
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                    CUSTOMER
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                    TOTAL AMOUNT
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                    APPROVED
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider uppercase text-center">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedEstimates.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="font-semibold text-blue-600 text-xs font-mono">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 text-xs">
                      {inv.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs">
                      {formatCurrency(inv.totalAmount, currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {inv.financeApprovedAt
                        ? new Date(inv.financeApprovedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 rounded-lg"
                          title="View Details"
                          onClick={() => setDetailTarget(inv)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                          onClick={() => openShare(inv)}
                        >
                          <Send className="h-3.5 w-3.5" /> Send to Customer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Send estimate to customer */}
      {shareTicket && (
        <SendDocumentModal
          open={shareOpen}
          onOpenChange={(v) => {
            setShareOpen(v);
            if (!v) setShareTicket(null);
          }}
          ticketId={shareTicket.id}
          ticketNumber={shareTicket.ticketNumber}
          docType="quotation"
          initialEmail={shareCustomer.email}
          initialPhone={shareCustomer.phone}
          customerName={shareCustomer.name}
        />
      )}

      {/* Detail View Dialog */}
      {detailTarget && (
        <Dialog open onOpenChange={(v) => !v && setDetailTarget(null)}>
          <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
            {/* Header band */}
            <DialogHeader className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 space-y-2">
              <div className="flex items-start justify-between gap-3 pr-8">
                <div>
                  <DialogTitle className="text-white text-lg font-bold tracking-tight">
                    Service Estimate Review
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-0.5">
                    Items, charges and technician context for this estimate.
                  </DialogDescription>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-mono text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-400/20 px-2.5 py-1 rounded-lg">
                    {detailTarget.invoiceNumber}
                  </span>
                  {(detailTarget.revisionCount || 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Revision {detailTarget.revisionCount}
                    </span>
                  )}
                </div>
              </div>
              {/* Party strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'Customer', value: detailTarget.customerName || 'Walk-in' },
                  { label: 'Technician', value: detailTarget.employeeName || '—' },
                  {
                    label: 'Ticket',
                    value: ticketDetails?.ticketNumber
                      ? ticketDetails.ticketNumber
                      : detailTarget.serviceTicketId
                        ? `${detailTarget.serviceTicketId.substring(0, 8)}…`
                        : '—',
                    mono: true,
                  },
                  {
                    label: 'Created',
                    value: new Date(detailTarget.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {f.label}
                    </span>
                    <span
                      className={`block text-[11px] font-semibold text-slate-100 truncate ${
                        f.mono ? 'font-mono' : ''
                      }`}
                      title={f.value}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </DialogHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/60">
              {/* Ticket Details Section */}
              {detailTarget.serviceTicketId && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="text-primary h-3.5 w-3.5" /> Service Ticket Context
                  </h4>

                  {loadingTicket ? (
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading ticket details...</span>
                    </div>
                  ) : ticketDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="md:col-span-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Complaint Registered
                        </span>
                        <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-medium">
                          {ticketDetails.issueDescription || 'No complaint details provided.'}
                        </p>
                      </div>

                      {ticketDetails.problemFound && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Problem Found
                          </span>
                          <span className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 block">
                            {ticketDetails.problemFound}
                          </span>
                        </div>
                      )}

                      {ticketDetails.rootCause && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Root Cause
                          </span>
                          <span className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 block">
                            {ticketDetails.rootCause}
                          </span>
                        </div>
                      )}

                      {ticketDetails.meterReadingAtService !== undefined && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Meter Reading
                          </span>
                          <span className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 block font-mono">
                            {Number(ticketDetails.meterReadingAtService).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {ticketDetails.diagnosisNotes && (
                        <div className="md:col-span-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Technician Diagnosis Notes
                          </span>
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap font-medium">
                            {ticketDetails.diagnosisNotes}
                          </p>
                        </div>
                      )}
                      {(ticketDetails.technicianNoteToFinance ||
                        detailTarget.technicianNoteToFinance) && (
                        <div className="md:col-span-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                            📝 Note to Finance
                          </span>
                          <p className="text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200/70 font-medium whitespace-pre-wrap">
                            {ticketDetails.technicianNoteToFinance ||
                              detailTarget.technicianNoteToFinance}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-red-500">Failed to load ticket details.</div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-3.5 pb-2">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Estimate Items
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Item / Description
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
                          Qty
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTarget.items && detailTarget.items.length > 0 ? (
                        detailTarget.items.map((item, idx) => {
                          const lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
                          const isFoc = (item.unitPrice || 0) === 0;
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50/60">
                              <TableCell className="font-medium text-slate-800 max-w-[320px]">
                                <span className="block truncate" title={item.description}>
                                  {item.description}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-slate-600">
                                {item.quantity || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-slate-600">
                                {isFoc ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                    FOC
                                  </Badge>
                                ) : (
                                  formatCurrency(item.unitPrice || 0, currency)
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-slate-800">
                                {formatCurrency(lineTotal, currency)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                            No items in this estimate.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals breakdown */}
                {(() => {
                  const itemsSubtotal = (detailTarget.items || []).reduce(
                    (sum, it) => sum + (it.unitPrice || 0) * (it.quantity || 0),
                    0,
                  );
                  const visitCharge =
                    Number(detailTarget.visitChargeAmount) ||
                    Number(ticketDetails?.visitChargeAmount) ||
                    0;
                  const visitAdded =
                    (detailTarget.visitChargeMethod || ticketDetails?.visitChargeMethod) ===
                    'ADDED_TO_ESTIMATE';
                  // Older estimates lost the discount on the invoice — fall back to
                  // the amount recorded on the service ticket itself.
                  const discount =
                    Number(detailTarget.totalDiscountAmount) ||
                    Number(ticketDetails?.discountAmount) ||
                    0;
                  return (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                      <div className="ml-auto w-full sm:w-72 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Items Subtotal</span>
                          <span className="font-mono">
                            {formatCurrency(itemsSubtotal, currency)}
                          </span>
                        </div>
                        {visitCharge > 0 && (
                          <div className="flex justify-between text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              Visit Charge
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                  visitAdded
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {visitAdded ? 'In Estimate' : 'Cash On-Site'}
                              </span>
                            </span>
                            <span className="font-mono">
                              {visitAdded
                                ? formatCurrency(visitCharge, currency)
                                : `(${formatCurrency(visitCharge, currency)})`}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between text-rose-600 font-semibold">
                            <span>Discount</span>
                            <span className="font-mono">
                              − {formatCurrency(discount, currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Grand Total
                          </span>
                          <span className="text-lg font-extrabold text-primary font-mono">
                            {formatCurrency(detailTarget.totalAmount, currency)}
                          </span>
                        </div>
                        {visitCharge > 0 && !visitAdded && (
                          <p className="text-[10px] text-amber-700 font-medium leading-snug pt-1">
                            Visit charge is collected separately in cash on-site and is not part of
                            this total.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Sticky footer */}
            <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 bg-white px-6 py-4">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setDetailTarget(null)}
              >
                Close
              </Button>
              {detailTarget.status === 'WAITING_FINANCE_APPROVAL' ? (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5 rounded-xl"
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
                    className="gap-1.5 rounded-xl"
                    onClick={() => {
                      openReject(detailTarget);
                      setDetailTarget(null);
                    }}
                    disabled={actionLoading}
                  >
                    <XCircle size={14} /> Reject
                  </Button>
                </>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl"
                  onClick={() => {
                    setDetailTarget(null);
                    openShare(detailTarget);
                  }}
                >
                  <Send size={14} /> Send to Customer
                </Button>
              )}
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
