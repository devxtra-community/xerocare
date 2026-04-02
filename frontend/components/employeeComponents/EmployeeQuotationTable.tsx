'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Eye,
  Trash2,
  FilePlus2,
  Send,
  ShoppingCart,
  Key,
  FileSignature,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { ModelSelect } from '@/components/invoice/ModelSelect';
import { Model } from '@/lib/model';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import {
  createInvoice,
  getMyInvoices,
  getInvoiceById,
  employeeApproveInvoice,
  Invoice,
  CreateInvoicePayload,
} from '@/lib/invoice';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationType = 'SALE' | 'RENT' | 'LEASE';

interface SaleItem {
  description: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  discount: number;
  maxDiscount: number;
  isManual: boolean;
  productId?: string;
  isEditable: boolean;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-600',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
  };
  return (
    <Badge
      className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none ${map[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {status}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeQuotationTable() {
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [employeeJob, setEmployeeJob] = useState<EmployeeJob | null | undefined>(null);

  useEffect(() => {
    const user = getUserFromToken();
    setEmployeeJob(user?.employeeJob ?? null);
  }, []);

  // Compute which quotation types this employee can create
  const allowedTypes = useMemo((): QuotationType[] => {
    if (employeeJob === EmployeeJob.MANAGER) return ['SALE', 'RENT', 'LEASE'];
    if (employeeJob === EmployeeJob.SALES) return ['SALE'];
    if (employeeJob === EmployeeJob.RENT_AND_LEASE) return ['RENT', 'LEASE'];
    return ['SALE', 'RENT', 'LEASE']; // fallback (manager or unknown)
  }, [employeeJob]);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyInvoices();
      // Only show QUOTATION type invoices
      const quotationsOnly = data.filter((inv) => inv.type === 'QUOTATION');
      setQuotations(quotationsOnly);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
      toast.error('Failed to fetch quotations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);
  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  // Stats
  const total_q = quotations.length;
  const accepted_q = quotations.filter((q) => q.status === 'ACCEPTED').length;
  const rejected_q = quotations.filter((q) => q.status === 'REJECTED').length;

  // Filter
  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.invoiceNumber?.toLowerCase().includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      q.saleType?.toLowerCase().includes(s) ||
      q.status?.toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleView = async (id: string) => {
    try {
      const data = await getInvoiceById(id);
      setSelectedQ(data);
      setViewOpen(true);
    } catch {
      toast.error('Failed to load quotation details.');
    }
  };

  const handleCreate = async (payload: CreateInvoicePayload) => {
    try {
      const newQ = await createInvoice(payload);
      setQuotations((prev) => [newQ, ...prev]);
      setFormOpen(false);
      toast.success('Quotation created successfully.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create quotation.');
    }
  };

  const handleSendToFinance = async (id: string) => {
    try {
      await employeeApproveInvoice(id);
      toast.success('Quotation sent to Finance team!');
      setViewOpen(false);
      fetchQuotations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send to finance.');
    }
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
          title="Total Quotations"
          value={String(total_q)}
          subtitle="All quotations created"
        />
        <StatCard title="Accepted" value={String(accepted_q)} subtitle="Customer approved" />
        <StatCard title="Rejected" value={String(rejected_q)} subtitle="Customer declined" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage customer quotations</p>
        </div>
        <Button
          className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
          onClick={() => setFormOpen(true)}
        >
          <Plus size={16} /> Add Quotation
        </Button>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by number, customer, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[750px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-primary font-bold">QT NUMBER</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">AMOUNT</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                    <FilePlus2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No quotations yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((q, index) => (
                  <TableRow
                    key={q.id}
                    className={`${index % 2 ? 'bg-blue-50/10' : 'bg-card'} hover:bg-muted/50 transition-colors`}
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
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleView(q.id)}
                        title="View Quotation"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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

      {formOpen && (
        <QuotationFormModal
          allowedTypes={allowedTypes}
          onClose={() => setFormOpen(false)}
          onConfirm={handleCreate}
        />
      )}
      {viewOpen && selectedQ && (
        <QuotationViewDialog
          quotation={selectedQ}
          onClose={() => setViewOpen(false)}
          onSendToFinance={handleSendToFinance}
        />
      )}
    </div>
  );
}

// ─── Quotation Form Modal ─────────────────────────────────────────────────────

function QuotationFormModal({
  onClose,
  onConfirm,
  allowedTypes,
}: {
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void>;
  allowedTypes: QuotationType[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [quotationType, setQuotationType] = useState<QuotationType>(allowedTypes[0] ?? 'SALE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── SALE state ──────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [manualItemOpen, setManualItemOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);

  // ── RENT state ──────────────────────────────────────────────────────────
  const [selectedModels, setSelectedModels] = useState<(Model & { quantity: number })[]>([]);
  const [rentType, setRentType] = useState('FIXED_LIMIT');
  const [rentPeriod, setRentPeriod] = useState('MONTHLY');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');

  // ── LEASE state ─────────────────────────────────────────────────────────
  const [leaseType, setLeaseType] = useState<'EMI' | 'FSM'>('EMI');
  const [leaseTenureMonths, setLeaseTenureMonths] = useState('');
  const [totalLeaseAmount, setTotalLeaseAmount] = useState('');
  const [monthlyEmiAmount, setMonthlyEmiAmount] = useState('');

  // Auto-calc EMI
  useEffect(() => {
    if (leaseTenureMonths && totalLeaseAmount) {
      const tenure = Number(leaseTenureMonths);
      const total = Number(totalLeaseAmount);
      if (tenure > 0) setMonthlyEmiAmount(String(Math.round(total / tenure)));
    }
  }, [leaseTenureMonths, totalLeaseAmount]);

  // Auto-calc effectiveTo based on duration
  useEffect(() => {
    if (effectiveFrom && durationMonths) {
      const d = new Date(effectiveFrom);
      const months = Number(durationMonths);
      if (months > 0) {
        d.setMonth(d.getMonth() + months);
        d.setDate(d.getDate() - 1);
        setEffectiveTo(d.toISOString().split('T')[0]);
      }
    }
  }, [effectiveFrom, durationMonths]);

  // ── Sale item helpers ────────────────────────────────────────────────────
  const addItem = (item: SelectableItem) => {
    let description = '',
      basePrice = 0,
      maxDiscount = 0,
      productId: string | undefined;
    if ('part_name' in item) {
      description = item.part_name;
      basePrice = Number(item.base_price) || 0;
    } else {
      description = item.name;
      basePrice = item.sale_price || 0;
      maxDiscount = item.max_discount_amount || 0;
      productId = item.id;
    }
    setSaleItems((prev) => [
      ...prev,
      {
        description,
        quantity: 1,
        basePrice,
        discount: 0,
        unitPrice: basePrice,
        maxDiscount,
        isManual: false,
        productId,
        isEditable: !productId || basePrice === 0,
      },
    ]);
    toast.success(`Added ${description}`);
  };

  const removeItem = (i: number) => setSaleItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = items[index];
      if (field === 'quantity') items[index] = { ...item, quantity: Number(value) };
      else if (field === 'description') items[index] = { ...item, description: String(value) };
      else if (field === 'discount') {
        const d = Number(value);
        if (d > item.basePrice) {
          toast.error('Discount cannot exceed price');
          return prev;
        }
        items[index] = { ...item, discount: d, unitPrice: item.basePrice - d };
      } else if (field === 'basePrice' && item.isEditable) {
        const b = Number(value);
        items[index] = { ...item, basePrice: b, unitPrice: b - item.discount };
      }
      return items;
    });
  };

  const saleTotal = saleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Please select a customer.');
      return;
    }

    let payload: CreateInvoicePayload;

    if (quotationType === 'SALE') {
      if (saleItems.length === 0) {
        toast.error('Please add at least one item.');
        return;
      }
      const totalDiscount = saleItems.reduce((s, it) => s + (it.discount || 0) * it.quantity, 0);
      payload = {
        customerId,
        saleType: 'SALE',
        discountAmount: totalDiscount,
        items: saleItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.basePrice,
          productId: it.productId,
        })),
      };
    } else if (quotationType === 'RENT') {
      if (selectedModels.length === 0) {
        toast.error('Please add at least one machine model.');
        return;
      }
      payload = {
        customerId,
        saleType: 'RENT',
        rentType: rentType as CreateInvoicePayload['rentType'],
        rentPeriod: rentPeriod as CreateInvoicePayload['rentPeriod'],
        monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        items: selectedModels.map((m) => ({
          description: m.model_name,
          quantity: m.quantity,
          unitPrice: 0,
          itemType: 'PRODUCT' as const,
          modelId: m.id,
        })),
        pricingItems: selectedModels.map((m) => ({
          description: m.model_name,
          bwIncludedLimit: 0,
          colorIncludedLimit: 0,
          bwExcessRate: 0,
          colorExcessRate: 0,
        })),
      };
    } else {
      // LEASE
      if (selectedModels.length === 0) {
        toast.error('Please add at least one machine model.');
        return;
      }
      payload = {
        customerId,
        saleType: 'LEASE',
        leaseType,
        leaseTenureMonths: leaseTenureMonths ? Number(leaseTenureMonths) : undefined,
        totalLeaseAmount: totalLeaseAmount ? Number(totalLeaseAmount) : undefined,
        monthlyEmiAmount:
          leaseType === 'EMI' && monthlyEmiAmount ? Number(monthlyEmiAmount) : undefined,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        items: selectedModels.map((m) => ({
          description: m.model_name,
          quantity: m.quantity,
          unitPrice: 0,
          itemType: 'PRODUCT' as const,
          modelId: m.id,
        })),
      };
    }

    setIsSubmitting(true);
    try {
      await onConfirm(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    SALE: {
      icon: ShoppingCart,
      label: 'Sales Quotation',
      color: 'bg-blue-600',
      desc: 'Products & spare parts for direct sale',
    },
    RENT: {
      icon: Key,
      label: 'Rent Quotation',
      color: 'bg-orange-500',
      desc: 'Machine rental with pricing & billing cycle',
    },
    LEASE: {
      icon: FileSignature,
      label: 'Lease Quotation',
      color: 'bg-purple-600',
      desc: 'Long-term lease with EMI or FSM plan',
    },
  };
  const tc = typeConfig[quotationType];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-background h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-card border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-xl ${tc.color} text-white flex items-center justify-center shadow-lg`}
            >
              <tc.icon size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                New Quotation
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {tc.desc}
              </DialogDescription>
            </div>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-3 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  {s}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:block ${step >= s ? 'text-primary' : 'text-slate-400'}`}
                >
                  {s === 1 ? 'Type & Customer' : 'Quotation Details'}
                </span>
                {s < 2 && (
                  <div className={`h-px w-8 ${step > s ? 'bg-primary' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto grow scrollbar-hide bg-card/50">
          {step === 1 ? (
            <>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Quotation Type
                </label>
                {allowedTypes.length === 1 ? (
                  <div className="bg-card p-4 rounded-xl border border-primary/30 flex items-center gap-4">
                    {(() => {
                      const Icon = typeConfig[allowedTypes[0]].icon;
                      return <Icon size={20} className="text-primary" />;
                    })()}
                    <div>
                      <p className="text-sm font-bold text-primary">
                        {typeConfig[allowedTypes[0]].label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {typeConfig[allowedTypes[0]].desc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(typeConfig) as QuotationType[])
                      .filter((t) => allowedTypes.includes(t))
                      .map((type) => {
                        const Icon = typeConfig[type].icon;
                        const selected = quotationType === type;
                        const colors = {
                          SALE: selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-blue-300',
                          RENT: selected
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 hover:border-orange-300',
                          LEASE: selected
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 hover:border-purple-300',
                        };
                        return (
                          <button
                            key={type}
                            onClick={() => setQuotationType(type)}
                            className={`border-2 rounded-xl p-4 flex flex-col items-start gap-2 transition-all ${colors[type]}`}
                          >
                            <div
                              className={`p-2 rounded-lg ${selected ? 'bg-white/60' : 'bg-slate-50'}`}
                            >
                              <Icon size={18} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">{typeConfig[type].label}</p>
                              <p className="text-[10px] opacity-70 mt-0.5">
                                {typeConfig[type].desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Customer
                </label>
                <CustomerSelect value={customerId} onChange={setCustomerId} />
              </div>

              {/* Validity & Notes (Sale only) */}
              {quotationType === 'SALE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Valid For (days)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={validDays}
                      onChange={(e) => setValidDays(Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Notes (optional)
                    </label>
                    <Input
                      placeholder="Any notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Date range for RENT/LEASE */}
              {(quotationType === 'RENT' || quotationType === 'LEASE') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Months
                    </label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 12"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Effective From
                    </label>
                    <Input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Effective To
                    </label>
                    <Input
                      type="date"
                      value={effectiveTo}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── STEP 2: Type-specific fields ─────────────────────────── */}

              {/* ── SALE FIELDS ──────────────────────────────────────────── */}
              {quotationType === 'SALE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Products & Items
                    </h4>
                    {!manualItemOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManualItemOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary h-7"
                      >
                        + Manual Entry
                      </Button>
                    )}
                  </div>
                  <div className="bg-card p-2 rounded-xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <ProductSelect onSelect={addItem} />
                  </div>
                  {manualItemOpen && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setSaleItems((p) => [
                            ...p,
                            {
                              description: '',
                              quantity: 1,
                              basePrice: 0,
                              discount: 0,
                              unitPrice: 0,
                              maxDiscount: 999999,
                              isManual: true,
                              isEditable: true,
                            },
                          ]);
                          setManualItemOpen(false);
                        }}
                        size="sm"
                        variant="secondary"
                        className="text-xs font-bold"
                      >
                        Add Custom Row
                      </Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {saleItems.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                        <p className="text-sm font-bold text-slate-400">No items added yet.</p>
                        <p className="text-xs text-slate-300 mt-1">Search above to add products.</p>
                      </div>
                    ) : (
                      saleItems.map((item, index) => (
                        <div
                          key={index}
                          className="relative bg-card border border-border rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all"
                        >
                          <button
                            onClick={() => removeItem(index)}
                            className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">
                                Description
                              </label>
                              <Input
                                value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                readOnly={!item.isManual}
                                className={`h-9 font-bold text-sm ${!item.isManual ? 'bg-muted/50 border-transparent' : ''}`}
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase text-center block">
                                Qty
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                className="h-9 text-center font-bold"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase text-right block">
                                Rate (QAR)
                              </label>
                              <Input
                                type="number"
                                value={item.basePrice}
                                readOnly={!item.isEditable}
                                onChange={(e) => updateItem(index, 'basePrice', e.target.value)}
                                className={`h-9 text-right font-bold ${!item.isEditable ? 'bg-muted/50 text-muted-foreground' : ''}`}
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase text-center block">
                                Discount
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={item.discount === 0 ? '' : item.discount}
                                placeholder="0"
                                onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                className="h-9 text-center font-bold"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-col items-end justify-center h-9 mt-auto">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Net</p>
                              <p className="font-extrabold text-foreground">
                                {formatCurrency(item.quantity * item.unitPrice)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {saleItems.length > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
                      <p className="text-2xl font-black text-primary">
                        {formatCurrency(saleTotal)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── RENT FIELDS ───────────────────────────────────────────── */}
              {quotationType === 'RENT' && (
                <div className="space-y-5">
                  {/* Machines */}
                  <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" /> Machine Models
                    </label>
                    <ModelSelect
                      onSelect={(m) => {
                        if (selectedModels.find((x) => x.id === m.id)) return;
                        setSelectedModels((prev) => [...prev, { ...m, quantity: 1 }]);
                      }}
                    />
                    {selectedModels.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {selectedModels.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2"
                          >
                            <span className="text-sm font-bold text-slate-700">{m.model_name}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] text-slate-400 font-bold">QTY</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={m.quantity}
                                  onChange={(e) =>
                                    setSelectedModels((prev) =>
                                      prev.map((x) =>
                                        x.id === m.id
                                          ? { ...x, quantity: Number(e.target.value) }
                                          : x,
                                      ),
                                    )
                                  }
                                  className="h-7 w-16 text-center text-xs font-bold"
                                />
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedModels((p) => p.filter((x) => x.id !== m.id))
                                }
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rent Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Rent Type
                      </label>
                      <Select value={rentType} onValueChange={setRentType}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED_LIMIT">Fixed Limit (BW + Color)</SelectItem>
                          <SelectItem value="FIXED_COMBO">Fixed Combo (Combined)</SelectItem>
                          <SelectItem value="FIXED_FLAT">Fixed Flat Rate</SelectItem>
                          <SelectItem value="CPC">CPC (Cost Per Copy)</SelectItem>
                          <SelectItem value="CPC_COMBO">CPC Combo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Billing Period
                      </label>
                      <Select value={rentPeriod} onValueChange={setRentPeriod}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Monthly Rent (QAR)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Advance Amount (QAR)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Discount (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEASE FIELDS ──────────────────────────────────────────── */}
              {quotationType === 'LEASE' && (
                <div className="space-y-5">
                  {/* Machines */}
                  <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> Machine Models
                    </label>
                    <ModelSelect
                      onSelect={(m) => {
                        if (selectedModels.find((x) => x.id === m.id)) return;
                        setSelectedModels((prev) => [...prev, { ...m, quantity: 1 }]);
                      }}
                    />
                    {selectedModels.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {selectedModels.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-3 py-2"
                          >
                            <span className="text-sm font-bold text-slate-700">{m.model_name}</span>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min="1"
                                value={m.quantity}
                                onChange={(e) =>
                                  setSelectedModels((prev) =>
                                    prev.map((x) =>
                                      x.id === m.id
                                        ? { ...x, quantity: Number(e.target.value) }
                                        : x,
                                    ),
                                  )
                                }
                                className="h-7 w-16 text-center text-xs font-bold"
                              />
                              <button
                                onClick={() =>
                                  setSelectedModels((p) => p.filter((x) => x.id !== m.id))
                                }
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lease Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Lease Type
                      </label>
                      <Select
                        value={leaseType}
                        onValueChange={(v) => setLeaseType(v as 'EMI' | 'FSM')}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMI">EMI (Equated Monthly Instalment)</SelectItem>
                          <SelectItem value="FSM">FSM (Full Service Maintenance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Tenure (months)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 24"
                        value={leaseTenureMonths}
                        onChange={(e) => setLeaseTenureMonths(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Total Lease Amount (QAR)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={totalLeaseAmount}
                        onChange={(e) => setTotalLeaseAmount(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    {leaseType === 'EMI' && (
                      <div className="bg-card p-4 rounded-xl border border-purple-100 shadow-sm space-y-2">
                        <label className="text-[11px] font-bold text-purple-600 uppercase">
                          Monthly EMI (Auto-calculated)
                        </label>
                        <Input
                          type="number"
                          value={monthlyEmiAmount}
                          onChange={(e) => setMonthlyEmiAmount(e.target.value)}
                          className="h-9 text-sm font-bold text-purple-700"
                        />
                      </div>
                    )}
                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Discount (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-card border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Discard
          </button>
          <div className="flex gap-3">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl font-bold">
                ← Back
              </Button>
            )}
            {step === 1 ? (
              <Button
                className="h-11 px-8 rounded-xl bg-primary text-white font-bold shadow-lg"
                onClick={() => {
                  if (!customerId) {
                    toast.error('Please select a customer first.');
                    return;
                  }
                  setStep(2);
                }}
              >
                Next → Details
              </Button>
            ) : (
              <Button
                className="h-11 px-8 rounded-xl bg-primary text-white font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FilePlus2 size={16} />
                )}
                {isSubmitting ? 'Creating...' : 'Create Quotation'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quotation View Dialog ────────────────────────────────────────────────────

function QuotationViewDialog({
  quotation,
  onClose,
  onSendToFinance,
}: {
  quotation: Invoice;
  onClose: () => void;
  onSendToFinance: (id: string) => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  const canSend = quotation.status === 'DRAFT' || quotation.status === 'SENT';

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendToFinance(quotation.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-card border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {quotation.invoiceNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  Quotation Details
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge type={quotation.saleType} />
              <StatusBadge status={quotation.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-card/50 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Common Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Customer" value={quotation.customerName || 'Walk-in'} />
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

          {/* RENT specific */}
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

          {/* LEASE specific */}
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
                {quotation.discountPercent != null && (
                  <InfoRow label="Discount" value={`${quotation.discountPercent}%`} />
                )}
              </div>
            </div>
          )}

          {/* Items table */}
          {quotation.items && quotation.items.length > 0 && (
            <div className="bg-card rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-muted/30 border-b border-slate-100">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {quotation.saleType === 'SALE' ? 'Items' : 'Machine Models'}
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
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Grand Total
                    </p>
                    <p className="text-2xl font-black text-primary">
                      {formatCurrency(quotation.totalAmount)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finance remarks if rejected */}
          {quotation.financeRemarks && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                Finance Remarks
              </p>
              <p className="text-sm text-red-700">{quotation.financeRemarks}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-card flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">
            Close
          </Button>
          {canSend && (
            <Button
              className="rounded-xl font-bold bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
              disabled={sending}
              onClick={handleSend}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {sending ? 'Sending...' : 'Send to Finance'}
            </Button>
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
