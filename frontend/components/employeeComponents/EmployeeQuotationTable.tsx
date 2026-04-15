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
  Eye,
  Trash2,
  FilePlus2,
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

import { QuotationViewDialog } from './QuotationViewDialog';
import RentFormModal from './RentFormModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationType = 'RENT' | 'LEASE' | 'PRODUCT_SALE' | 'SPAREPART_SALE';

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
  bwIncludedLimit?: number;
  colorIncludedLimit?: number;
  combinedIncludedLimit?: number;
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;
  bwSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  colorSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  comboSlabRanges?: Array<{ from: string; to: string; rate: string }>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-600',
    ACCEPTED: 'bg-green-100 text-green-700',
    APPROVED: 'bg-green-100 text-green-700',
    FINANCE_APPROVED: 'bg-green-100 text-green-700',
    EMPLOYEE_APPROVED: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE_LEASE: 'bg-green-100 text-green-700',
  };

  const label: Record<string, string> = {
    EMPLOYEE_APPROVED: 'SENT TO FINANCE',
    FINANCE_APPROVED: 'ACCEPTED',
    APPROVED: 'ACCEPTED',
    ACTIVE_LEASE: 'ACTIVE',
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
    PRODUCT_SALE: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    SPAREPART_SALE: 'bg-teal-50 text-teal-600 border-teal-200',
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
  const [rentLeaseModal, setRentLeaseModal] = useState<{
    open: boolean;
    type: 'RENT' | 'LEASE';
    customerId: string;
  }>({ open: false, type: 'RENT', customerId: '' });
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
    if (employeeJob === EmployeeJob.MANAGER)
      return ['PRODUCT_SALE', 'SPAREPART_SALE', 'RENT', 'LEASE'];
    if (employeeJob === EmployeeJob.SALES) return ['PRODUCT_SALE', 'SPAREPART_SALE'];
    if (employeeJob === EmployeeJob.RENT_AND_LEASE) return ['RENT', 'LEASE'];
    return ['PRODUCT_SALE', 'SPAREPART_SALE', 'RENT', 'LEASE']; // fallback
  }, [employeeJob]);

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyInvoices();
      // Show QUOTATION and PROFORMA type invoices (which are Approved Quotations/Contracts)
      const quotationsOnly = data.filter(
        (inv) => inv.type === 'QUOTATION' || inv.type === 'PROFORMA',
      );
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
  const accepted_q = quotations.filter((q) =>
    ['ACCEPTED', 'APPROVED', 'FINANCE_APPROVED', 'PAID', 'ACTIVE_LEASE'].includes(q.status),
  ).length;
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
      {rentLeaseModal.open && (
        <RentFormModal
          onClose={() => setRentLeaseModal({ ...rentLeaseModal, open: false })}
          onConfirm={handleCreate}
          defaultSaleType={rentLeaseModal.type}
          lockSaleType={true}
          initialData={
            rentLeaseModal.customerId
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ customerId: rentLeaseModal.customerId } as any)
              : undefined
          }
          isQuotation={true}
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

interface CategoryCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
}

function CategoryCard({ icon: Icon, label, desc, color, onClick }: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 bg-card flex flex-col gap-3 ${color}`}
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h4 className="font-bold text-sm text-slate-800">{label}</h4>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
          {desc}
        </p>
      </div>
    </div>
  );
}

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
  const [activeCategory, setActiveCategory] = useState<'SALE' | 'RENT' | 'LEASE' | null>(null);
  const [quotationType, setQuotationType] = useState<QuotationType>(
    allowedTypes[0] ?? 'PRODUCT_SALE',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── SALE state ──────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [manualItemOpen, setManualItemOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);

  // ── RENT state ──────────────────────────────────────────────────────────
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
  const [lastEditedLease, setLastEditedLease] = useState<'TOTAL' | 'PERIODIC'>('TOTAL');

  // ── SECURITY DEPOSIT state ──────────────────────────────────────────────
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');
  const [securityDepositMode, setSecurityDepositMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [securityDepositReference, setSecurityDepositReference] = useState('');
  const [securityDepositBank, setSecurityDepositBank] = useState('');

  // ── Auto-Calculators ───────────────────────────────────────────────────
  const getPeriodsForRent = (period: string, duration: number) => {
    if (!duration || duration <= 0) return 0;
    switch (period) {
      case 'MONTHLY':
        return duration;
      case 'QUARTERLY':
        return duration / 3;
      case 'HALF_YEARLY':
        return duration / 6;
      case 'YEARLY':
        return duration / 12;
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (activeCategory !== 'LEASE' || !leaseTenureMonths) return;

    if (leaseType === 'EMI') {
      if (lastEditedLease === 'TOTAL' && totalLeaseAmount) {
        setMonthlyEmiAmount((Number(totalLeaseAmount) / Number(leaseTenureMonths)).toFixed(2));
      } else if (lastEditedLease === 'PERIODIC' && monthlyEmiAmount) {
        setTotalLeaseAmount((Number(monthlyEmiAmount) * Number(leaseTenureMonths)).toFixed(2));
      }
    } else if (leaseType === 'FSM') {
      const p = getPeriodsForRent(rentPeriod, Number(leaseTenureMonths));
      if (p <= 0) return;
      if (lastEditedLease === 'TOTAL' && totalLeaseAmount) {
        setMonthlyRent((Number(totalLeaseAmount) / p).toFixed(2));
      } else if (lastEditedLease === 'PERIODIC' && monthlyRent) {
        setTotalLeaseAmount((Number(monthlyRent) * p).toFixed(2));
      }
    }
  }, [
    totalLeaseAmount,
    monthlyEmiAmount,
    monthlyRent,
    leaseType,
    rentPeriod,
    leaseTenureMonths,
    lastEditedLease,
    activeCategory,
  ]);

  // ───────────────────────────────────────────────────────────────────────

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
        bwSlabRanges: [],
        colorSlabRanges: [],
        comboSlabRanges: [],
      },
    ]);
    toast.success(`Added ${description}`);
  };

  const removeItem = (i: number) => setSaleItems((prev) => prev.filter((_, idx) => idx !== i));

  const addSlab = (index: number, type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges') => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[index] };
      const current = item[type] || [];
      const lastTo = current.length > 0 ? current[current.length - 1].to : '0';
      item[type] = [...current, { from: String(Number(lastTo) + 1), to: '', rate: '' }];
      items[index] = item;
      return items;
    });
  };

  const removeSlab = (
    index: number,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
    slabIndex: number,
  ) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[index] };
      item[type] = (item[type] || []).filter((_, i) => i !== slabIndex);
      items[index] = item;
      return items;
    });
  };

  const updateSlab = (
    index: number,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
    slabIndex: number,
    field: 'from' | 'to' | 'rate',
    value: string,
  ) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[index] };
      const current = [...(item[type] || [])];
      current[slabIndex] = { ...current[slabIndex], [field]: value };
      item[type] = current;
      items[index] = item;
      return items;
    });
  };

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
      } else if (
        [
          'bwIncludedLimit',
          'colorIncludedLimit',
          'combinedIncludedLimit',
          'bwExcessRate',
          'colorExcessRate',
          'combinedExcessRate',
        ].includes(field as string)
      ) {
        items[index] = { ...item, [field]: Number(value) };
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

    if (['PRODUCT_SALE', 'SPAREPART_SALE'].includes(quotationType)) {
      if (saleItems.length === 0) {
        toast.error('Please add at least one item.');
        return;
      }
      const totalDiscount = saleItems.reduce((s, it) => s + (it.discount || 0) * it.quantity, 0);
      payload = {
        customerId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saleType: quotationType as any,
        discountAmount: totalDiscount,
        items: saleItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.basePrice,
          productId: it.productId,
        })),
      };
    } else if (quotationType === 'RENT') {
      if (saleItems.length === 0) {
        toast.error('Please add at least one specific machine (Product).');
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

        // Security Deposit
        securityDepositAmount: securityDepositAmount ? Number(securityDepositAmount) : undefined,
        securityDepositMode,
        securityDepositReference,
        securityDepositBank,

        items: saleItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: 0,
          itemType: 'PRODUCT' as const,
          productId: it.productId,
          bwIncludedLimit: rentType === 'FIXED_LIMIT' ? it.bwIncludedLimit || 0 : 0,
          colorIncludedLimit: rentType === 'FIXED_LIMIT' ? it.colorIncludedLimit || 0 : 0,
          combinedIncludedLimit: rentType === 'FIXED_COMBO' ? it.combinedIncludedLimit || 0 : 0,
          bwExcessRate: rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.bwExcessRate || 0 : 0,
          colorExcessRate:
            rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.colorExcessRate || 0 : 0,
          combinedExcessRate:
            rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO' ? it.combinedExcessRate || 0 : 0,
          bwSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.bwSlabRanges?.length
              ? it.bwSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
          colorSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.colorSlabRanges?.length
              ? it.colorSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
          comboSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.comboSlabRanges?.length
              ? it.comboSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
        })),
        pricingItems: saleItems.map((it) => ({
          description: it.description,
          bwIncludedLimit: rentType === 'FIXED_LIMIT' ? it.bwIncludedLimit || 0 : 0,
          colorIncludedLimit: rentType === 'FIXED_LIMIT' ? it.colorIncludedLimit || 0 : 0,
          combinedIncludedLimit: rentType === 'FIXED_COMBO' ? it.combinedIncludedLimit || 0 : 0,
          bwExcessRate: rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.bwExcessRate || 0 : 0,
          colorExcessRate:
            rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.colorExcessRate || 0 : 0,
          combinedExcessRate:
            rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO' ? it.combinedExcessRate || 0 : 0,
          bwSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.bwSlabRanges?.length
              ? it.bwSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
          colorSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.colorSlabRanges?.length
              ? it.colorSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
          comboSlabRanges:
            (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.comboSlabRanges?.length
              ? it.comboSlabRanges.map((r) => ({
                  from: Number(r.from) || 0,
                  to: Number(r.to) || 0,
                  rate: Number(r.rate) || 0,
                }))
              : undefined,
        })),
      };
    } else {
      // LEASE
      if (saleItems.length === 0) {
        toast.error('Please add at least one specific machine (Product).');
        return;
      }
      payload = {
        customerId,
        saleType: 'LEASE',
        leaseType,
        leaseTenureMonths: leaseTenureMonths ? Number(leaseTenureMonths) : undefined,
        totalLeaseAmount: totalLeaseAmount ? Number(totalLeaseAmount) : 0,
        monthlyEmiAmount: monthlyEmiAmount ? Number(monthlyEmiAmount) : 0,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,

        // Security Deposit
        securityDepositAmount: securityDepositAmount ? Number(securityDepositAmount) : undefined,
        securityDepositMode,
        securityDepositReference,
        securityDepositBank,

        // For FSM Leases, we need rentType and monthly rent mapped dynamically
        rentType: leaseType === 'FSM' ? (rentType as CreateInvoicePayload['rentType']) : undefined,
        monthlyRent: leaseType === 'FSM' && monthlyRent ? Number(monthlyRent) : undefined,
        monthlyLeaseAmount:
          leaseType === 'FSM' && totalLeaseAmount ? Number(totalLeaseAmount) : undefined,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        items: saleItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: 0,
          itemType: 'PRODUCT' as const,
          productId: it.productId,
          ...(leaseType === 'FSM'
            ? {
                bwIncludedLimit: rentType === 'FIXED_LIMIT' ? it.bwIncludedLimit || 0 : 0,
                colorIncludedLimit: rentType === 'FIXED_LIMIT' ? it.colorIncludedLimit || 0 : 0,
                combinedIncludedLimit:
                  rentType === 'FIXED_COMBO' ? it.combinedIncludedLimit || 0 : 0,
                bwExcessRate:
                  rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.bwExcessRate || 0 : 0,
                colorExcessRate:
                  rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.colorExcessRate || 0 : 0,
                combinedExcessRate:
                  rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO'
                    ? it.combinedExcessRate || 0
                    : 0,
                bwSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.bwSlabRanges?.length
                    ? it.bwSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
                colorSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.colorSlabRanges?.length
                    ? it.colorSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
                comboSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.comboSlabRanges?.length
                    ? it.comboSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
              }
            : {}),
        })),
        pricingItems:
          leaseType === 'FSM'
            ? saleItems.map((it) => ({
                description: it.description,
                bwIncludedLimit: rentType === 'FIXED_LIMIT' ? it.bwIncludedLimit || 0 : 0,
                colorIncludedLimit: rentType === 'FIXED_LIMIT' ? it.colorIncludedLimit || 0 : 0,
                combinedIncludedLimit:
                  rentType === 'FIXED_COMBO' ? it.combinedIncludedLimit || 0 : 0,
                bwExcessRate:
                  rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.bwExcessRate || 0 : 0,
                colorExcessRate:
                  rentType === 'FIXED_LIMIT' || rentType === 'CPC' ? it.colorExcessRate || 0 : 0,
                combinedExcessRate:
                  rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO'
                    ? it.combinedExcessRate || 0
                    : 0,
                bwSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.bwSlabRanges?.length
                    ? it.bwSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
                colorSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.colorSlabRanges?.length
                    ? it.colorSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
                comboSlabRanges:
                  (rentType === 'CPC' || rentType === 'CPC_COMBO') && it.comboSlabRanges?.length
                    ? it.comboSlabRanges.map((r) => ({
                        from: Number(r.from) || 0,
                        to: Number(r.to) || 0,
                        rate: Number(r.rate) || 0,
                      }))
                    : undefined,
              }))
            : [],
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
    PRODUCT_SALE: {
      icon: ShoppingCart,
      label: 'Product Sale',
      color: 'bg-blue-600',
      desc: 'Direct sale of full machines & products',
    },
    SPAREPART_SALE: {
      icon: ShoppingCart,
      label: 'Spare Part Sale',
      color: 'bg-cyan-600',
      desc: 'Sale of spare parts and components',
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
                <div className="space-y-4">
                  {!activeCategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <CategoryCard
                        icon={ShoppingCart}
                        label="Sales Quotation"
                        desc="Products and Spare Parts"
                        color="border-blue-200 hover:border-blue-400"
                        onClick={() => {
                          setActiveCategory('SALE');
                          if (allowedTypes.includes('PRODUCT_SALE')) {
                            setQuotationType('PRODUCT_SALE');
                          } else if (allowedTypes.includes('SPAREPART_SALE')) {
                            setQuotationType('SPAREPART_SALE');
                          }
                        }}
                      />
                      <CategoryCard
                        icon={Key}
                        label="Rent Quotation"
                        desc="Machine Rental Plans"
                        color="border-orange-200 hover:border-orange-400"
                        onClick={() => {
                          setActiveCategory('RENT');
                          setQuotationType('RENT');
                        }}
                      />
                      <CategoryCard
                        icon={FileSignature}
                        label="Lease Quotation"
                        desc="EMI and FSM Options"
                        color="border-purple-200 hover:border-purple-400"
                        onClick={() => {
                          setActiveCategory('LEASE');
                          setQuotationType('LEASE');
                        }}
                      />
                    </div>
                  ) : activeCategory === 'SALE' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveCategory(null)}
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary h-7"
                        >
                          ← Back to Categories
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setQuotationType('PRODUCT_SALE')}
                          className={`border-2 rounded-xl p-4 flex flex-col items-start gap-2 transition-all ${
                            quotationType === 'PRODUCT_SALE'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${quotationType === 'PRODUCT_SALE' ? 'bg-white/60' : 'bg-slate-50'}`}
                          >
                            <ShoppingCart size={18} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Product Sale</p>
                            <p className="text-[10px] opacity-70 mt-0.5">
                              Full machines and equipments
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => setQuotationType('SPAREPART_SALE')}
                          className={`border-2 rounded-xl p-4 flex flex-col items-start gap-2 transition-all ${
                            quotationType === 'SPAREPART_SALE'
                              ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                              : 'border-slate-200 hover:border-cyan-300'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${quotationType === 'SPAREPART_SALE' ? 'bg-white/60' : 'bg-slate-50'}`}
                          >
                            <ShoppingCart size={18} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Spare Part Sale</p>
                            <p className="text-[10px] opacity-70 mt-0.5">
                              Individual components and parts
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card p-4 rounded-xl border border-primary/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {(() => {
                          const Icon = activeCategory === 'RENT' ? Key : FileSignature;
                          return <Icon size={20} className="text-primary" />;
                        })()}
                        <div>
                          <p className="text-sm font-bold text-primary">
                            {activeCategory === 'RENT' ? 'Rent Quotation' : 'Lease Quotation'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {activeCategory === 'RENT'
                              ? 'Machine rental plan'
                              : 'Long-term lease option'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveCategory(null)}
                        className="text-[10px] font-bold uppercase text-slate-400"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer */}
              <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Customer
                </label>
                <CustomerSelect value={customerId} onChange={setCustomerId} />
              </div>

              {/* Validity & Notes (Sale only) */}
              {['PRODUCT_SALE', 'SPAREPART_SALE'].includes(quotationType) && (
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

              {/* Date range for RENT/LEASE removed. UI inputs now properly reside only in Step 2. */}
            </>
          ) : (
            <>
              {/* ── STEP 2: Type-specific fields ─────────────────────────── */}

              {/* ── SALE FIELDS ──────────────────────────────────────────── */}
              {['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(quotationType) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />{' '}
                      {quotationType === 'PRODUCT_SALE'
                        ? 'Products'
                        : quotationType === 'SPAREPART_SALE'
                          ? 'Spare Parts'
                          : 'Items'}
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
                    <ProductSelect
                      onSelect={addItem}
                      mode={
                        quotationType === 'PRODUCT_SALE'
                          ? 'PRODUCT'
                          : quotationType === 'SPAREPART_SALE'
                            ? 'SPAREPART'
                            : 'BOTH'
                      }
                    />
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
                <div className="space-y-5 mb-6">
                  {/* Rent Type Selector Moved to Top */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-blue-200 shadow-sm space-y-2 bg-blue-50/30">
                      <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" /> Rent Type / Model
                      </label>
                      <Select value={rentType} onValueChange={setRentType}>
                        <SelectTrigger className="h-9 text-sm border-blue-100">
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
                  </div>

                  {/* Machines */}
                  <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" /> Specific Machines
                      (Products)
                    </label>
                    <ProductSelect
                      mode="PRODUCT"
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id)) return;
                        addItem(item);
                      }}
                    />
                    {saleItems.length > 0 && (
                      <div className="space-y-4 mt-2">
                        {saleItems.map((m, index) => (
                          <div
                            key={m.productId || index}
                            className="flex flex-col gap-3 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800">
                                {m.description}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] text-slate-500 font-bold">
                                    QTY
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={m.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="h-8 w-16 text-center text-xs font-bold"
                                  />
                                </div>
                                <button
                                  onClick={() => removeItem(index)}
                                  className="text-slate-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Dynamic Pricing Inputs Based on Rent Type */}
                            {rentType !== 'FIXED_FLAT' && (
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3 rounded border border-orange-100 shadow-sm">
                                {rentType === 'FIXED_LIMIT' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      B/W Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.bwIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'bwIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {rentType === 'FIXED_COMBO' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Combo Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.combinedIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'combinedIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {rentType === 'FIXED_LIMIT' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Color Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.colorIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'colorIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      B/W Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.bwExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'bwExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Color Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.colorExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'colorExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Combo Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.combinedExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'combinedExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Slab Rates UI for CPC */}
                            {(rentType === 'CPC' || rentType === 'CPC_COMBO') && (
                              <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                  <span>Slab Rates Configuration</span>
                                </label>

                                {rentType === 'CPC' && (
                                  <div className="space-y-4 mt-2">
                                    {/* B/W Slabs */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                        <span className="text-[10px] font-bold">
                                          Black & White Slabs
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-blue-600 px-2"
                                          onClick={() => addSlab(index, 'bwSlabRanges')}
                                        >
                                          + Add Slab
                                        </Button>
                                      </div>
                                      {m.bwSlabRanges?.map((slab, sIdx) => (
                                        <div
                                          key={`bw-${sIdx}`}
                                          className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                        >
                                          <Input
                                            placeholder="From"
                                            type="number"
                                            value={slab.from}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'from',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="To"
                                            type="number"
                                            value={slab.to}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'to',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="Rate"
                                            type="number"
                                            value={slab.rate}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'rate',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs font-bold text-blue-600 flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400"
                                            onClick={() => removeSlab(index, 'bwSlabRanges', sIdx)}
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Color Slabs */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                        <span className="text-[10px] font-bold">Color Slabs</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-blue-600 px-2"
                                          onClick={() => addSlab(index, 'colorSlabRanges')}
                                        >
                                          + Add Slab
                                        </Button>
                                      </div>
                                      {m.colorSlabRanges?.map((slab, sIdx) => (
                                        <div
                                          key={`color-${sIdx}`}
                                          className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                        >
                                          <Input
                                            placeholder="From"
                                            type="number"
                                            value={slab.from}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'from',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="To"
                                            type="number"
                                            value={slab.to}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'to',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="Rate"
                                            type="number"
                                            value={slab.rate}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'rate',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs font-bold text-blue-600 flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400"
                                            onClick={() =>
                                              removeSlab(index, 'colorSlabRanges', sIdx)
                                            }
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {rentType === 'CPC_COMBO' && (
                                  <div className="space-y-2 mt-2">
                                    <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                      <span className="text-[10px] font-bold">Combined Slabs</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-blue-600 px-2"
                                        onClick={() => addSlab(index, 'comboSlabRanges')}
                                      >
                                        + Add Slab
                                      </Button>
                                    </div>
                                    {m.comboSlabRanges?.map((slab, sIdx) => (
                                      <div
                                        key={`combo-${sIdx}`}
                                        className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                      >
                                        <Input
                                          placeholder="From"
                                          type="number"
                                          value={slab.from}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'from',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs flex-1"
                                        />
                                        <Input
                                          placeholder="To"
                                          type="number"
                                          value={slab.to}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'to',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs flex-1"
                                        />
                                        <Input
                                          placeholder="Rate"
                                          type="number"
                                          value={slab.rate}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'rate',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs font-bold text-blue-600 flex-1"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-400"
                                          onClick={() => removeSlab(index, 'comboSlabRanges', sIdx)}
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rent Config - Remaining Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>Periodic Rent ({rentPeriod.replace('_', ' ')})</span>
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

                  {/* Agreement Details (Shared for Rent/Lease) */}
                  <div className="bg-card p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Agreement Terms
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Effective From
                        </label>
                        <Input
                          type="date"
                          value={effectiveFrom}
                          onChange={(e) => setEffectiveFrom(e.target.value)}
                          className="h-9 text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-center w-full block">
                          Duration (Months)
                        </label>
                        <Input
                          type="number"
                          placeholder="12"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          className="h-9 text-sm text-center border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-right w-full block">
                          Contract End (Auto)
                        </label>
                        <Input
                          type="date"
                          readOnly
                          value={effectiveTo}
                          className="h-9 text-sm bg-slate-50 text-right opacity-70 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Security Deposit Amount (QAR)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={securityDepositAmount}
                          onChange={(e) => setSecurityDepositAmount(e.target.value)}
                          className="h-9 text-sm border-blue-100 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Deposit Mode
                        </label>
                        <Select
                          value={securityDepositMode}
                          onValueChange={(v) => setSecurityDepositMode(v as 'CASH' | 'CHEQUE')}
                        >
                          <SelectTrigger className="h-9 text-sm border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHEQUE">Cheque / Reference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {securityDepositMode === 'CHEQUE' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Bank Name
                            </label>
                            <Input
                              placeholder="e.g. QNB"
                              value={securityDepositBank}
                              onChange={(e) => setSecurityDepositBank(e.target.value)}
                              className="h-9 text-sm border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Cheque/Ref Number
                            </label>
                            <Input
                              placeholder="Reference #"
                              value={securityDepositReference}
                              onChange={(e) => setSecurityDepositReference(e.target.value)}
                              className="h-9 text-sm border-slate-200"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEASE FIELDS ──────────────────────────────────────────── */}
              {quotationType === 'LEASE' && (
                <div className="space-y-5 mb-6">
                  {/* Lease Type Selector Moved to Top */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-purple-200 shadow-sm space-y-2 bg-purple-50/30">
                      <label className="text-[11px] font-bold text-purple-600 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" /> Lease Type
                      </label>
                      <Select
                        value={leaseType}
                        onValueChange={(v) => setLeaseType(v as 'EMI' | 'FSM')}
                      >
                        <SelectTrigger className="h-9 text-sm border-purple-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMI">EMI (Equated Monthly Instalment)</SelectItem>
                          <SelectItem value="FSM">FSM (Full Service Maintenance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {leaseType === 'FSM' && (
                      <div className="bg-card p-4 rounded-xl border border-blue-200 shadow-sm space-y-2 bg-blue-50/30">
                        <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" /> Service Billing Type
                          (FSM)
                        </label>
                        <Select value={rentType} onValueChange={setRentType}>
                          <SelectTrigger className="h-9 text-sm border-blue-100">
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
                    )}
                  </div>

                  {/* Machines */}
                  <div className="bg-card p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> Specific Machines
                      (Products)
                    </label>
                    <ProductSelect
                      mode="PRODUCT"
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id)) return;
                        addItem(item);
                      }}
                    />
                    {saleItems.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {saleItems.map((m, index) => (
                          <div
                            key={m.productId || index}
                            className="flex flex-col gap-3 bg-purple-50 border border-purple-100 rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800">
                                {m.description}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] text-slate-500 font-bold">
                                    QTY
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={m.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="h-8 w-16 text-center text-xs font-bold"
                                  />
                                </div>
                                <button
                                  onClick={() => removeItem(index)}
                                  className="text-slate-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            {/* Dynamic Pricing Inputs for Lease FSM */}
                            {leaseType === 'FSM' && rentType !== 'FIXED_FLAT' && (
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3 rounded border border-purple-100 shadow-sm">
                                {rentType === 'FIXED_LIMIT' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      B/W Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.bwIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'bwIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {rentType === 'FIXED_COMBO' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Combo Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.combinedIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'combinedIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {rentType === 'FIXED_LIMIT' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Color Limit
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Copies"
                                      value={m.colorIncludedLimit || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'colorIncludedLimit', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      B/W Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.bwExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'bwExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Color Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.colorExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'colorExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                                {(rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO') && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Combo Excess Rate
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="Rate"
                                      value={m.combinedExcessRate || ''}
                                      onChange={(e) =>
                                        updateItem(index, 'combinedExcessRate', e.target.value)
                                      }
                                      className="h-8 text-[11px] font-bold"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Slab Rates UI for CPC */}
                            {(rentType === 'CPC' || rentType === 'CPC_COMBO') && (
                              <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                  <span>Slab Rates Configuration</span>
                                </label>

                                {rentType === 'CPC' && (
                                  <div className="space-y-4 mt-2">
                                    {/* B/W Slabs */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                        <span className="text-[10px] font-bold">
                                          Black & White Slabs
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-blue-600 px-2"
                                          onClick={() => addSlab(index, 'bwSlabRanges')}
                                        >
                                          + Add Slab
                                        </Button>
                                      </div>
                                      {m.bwSlabRanges?.map((slab, sIdx) => (
                                        <div
                                          key={`bw-${sIdx}`}
                                          className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                        >
                                          <Input
                                            placeholder="From"
                                            type="number"
                                            value={slab.from}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'from',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="To"
                                            type="number"
                                            value={slab.to}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'to',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="Rate"
                                            type="number"
                                            value={slab.rate}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'bwSlabRanges',
                                                sIdx,
                                                'rate',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs font-bold text-blue-600 flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400"
                                            onClick={() => removeSlab(index, 'bwSlabRanges', sIdx)}
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Color Slabs */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                        <span className="text-[10px] font-bold">Color Slabs</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-blue-600 px-2"
                                          onClick={() => addSlab(index, 'colorSlabRanges')}
                                        >
                                          + Add Slab
                                        </Button>
                                      </div>
                                      {m.colorSlabRanges?.map((slab, sIdx) => (
                                        <div
                                          key={`color-${sIdx}`}
                                          className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                        >
                                          <Input
                                            placeholder="From"
                                            type="number"
                                            value={slab.from}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'from',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="To"
                                            type="number"
                                            value={slab.to}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'to',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs flex-1"
                                          />
                                          <Input
                                            placeholder="Rate"
                                            type="number"
                                            value={slab.rate}
                                            onChange={(e) =>
                                              updateSlab(
                                                index,
                                                'colorSlabRanges',
                                                sIdx,
                                                'rate',
                                                e.target.value,
                                              )
                                            }
                                            className="h-7 text-xs font-bold text-blue-600 flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400"
                                            onClick={() =>
                                              removeSlab(index, 'colorSlabRanges', sIdx)
                                            }
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {rentType === 'CPC_COMBO' && (
                                  <div className="space-y-2 mt-2">
                                    <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                                      <span className="text-[10px] font-bold">Combined Slabs</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-blue-600 px-2"
                                        onClick={() => addSlab(index, 'comboSlabRanges')}
                                      >
                                        + Add Slab
                                      </Button>
                                    </div>
                                    {m.comboSlabRanges?.map((slab, sIdx) => (
                                      <div
                                        key={`combo-${sIdx}`}
                                        className="flex gap-2 items-center pl-2 border-l-2 border-blue-200"
                                      >
                                        <Input
                                          placeholder="From"
                                          type="number"
                                          value={slab.from}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'from',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs flex-1"
                                        />
                                        <Input
                                          placeholder="To"
                                          type="number"
                                          value={slab.to}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'to',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs flex-1"
                                        />
                                        <Input
                                          placeholder="Rate"
                                          type="number"
                                          value={slab.rate}
                                          onChange={(e) =>
                                            updateSlab(
                                              index,
                                              'comboSlabRanges',
                                              sIdx,
                                              'rate',
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 text-xs font-bold text-blue-600 flex-1"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-400"
                                          onClick={() => removeSlab(index, 'comboSlabRanges', sIdx)}
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lease Config - Remaining Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        onChange={(e) => {
                          setLastEditedLease('TOTAL');
                          setTotalLeaseAmount(e.target.value);
                          if (!e.target.value) {
                            setMonthlyEmiAmount('');
                            setMonthlyRent('');
                          }
                        }}
                        className="h-9 text-sm font-bold text-blue-700"
                      />
                    </div>
                    {leaseType === 'EMI' && (
                      <div className="bg-card p-4 rounded-xl border border-purple-100 shadow-sm space-y-2">
                        <label className="text-[11px] font-bold text-purple-600 uppercase flex items-center justify-between">
                          <span>Monthly EMI (QAR)</span>
                          <span className="text-[9px] lowercase">(auto)</span>
                        </label>
                        <Input
                          type="number"
                          value={monthlyEmiAmount}
                          onChange={(e) => {
                            setLastEditedLease('PERIODIC');
                            setMonthlyEmiAmount(e.target.value);
                            if (!e.target.value) setTotalLeaseAmount('');
                          }}
                          className="h-9 text-sm font-bold text-purple-700"
                        />
                      </div>
                    )}
                    {leaseType === 'FSM' && (
                      <div className="bg-card p-4 rounded-xl border border-purple-100 shadow-sm space-y-2">
                        <label className="text-[11px] font-bold text-purple-600 uppercase flex items-center justify-between">
                          <span>Periodic Rent ({rentPeriod.replace('_', ' ')})</span>
                          <span className="text-[9px] lowercase">(auto)</span>
                        </label>
                        <Input
                          type="number"
                          value={monthlyRent}
                          onChange={(e) => {
                            setLastEditedLease('PERIODIC');
                            setMonthlyRent(e.target.value);
                            if (!e.target.value) setTotalLeaseAmount('');
                          }}
                          className="h-9 text-sm font-bold text-blue-700"
                        />
                      </div>
                    )}
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

                  {/* Agreement Details (Shared for Rent/Lease) */}
                  <div className="bg-card p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Agreement Terms
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Effective From
                        </label>
                        <Input
                          type="date"
                          value={effectiveFrom}
                          onChange={(e) => setEffectiveFrom(e.target.value)}
                          className="h-9 text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-center w-full block">
                          Duration (Months)
                        </label>
                        <Input
                          type="number"
                          placeholder="12"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          className="h-9 text-sm text-center border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-right w-full block">
                          Contract End (Auto)
                        </label>
                        <Input
                          type="date"
                          readOnly
                          value={effectiveTo}
                          className="h-9 text-sm bg-slate-50 text-right opacity-70 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Security Deposit Amount (QAR)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={securityDepositAmount}
                          onChange={(e) => setSecurityDepositAmount(e.target.value)}
                          className="h-9 text-sm border-blue-100 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Deposit Mode
                        </label>
                        <span className="flex-1" />
                        <Select
                          value={securityDepositMode}
                          onValueChange={(v) => setSecurityDepositMode(v as 'CASH' | 'CHEQUE')}
                        >
                          <SelectTrigger className="h-9 text-sm border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHEQUE">Cheque / Reference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {securityDepositMode === 'CHEQUE' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Bank Name
                            </label>
                            <Input
                              placeholder="e.g. QNB"
                              value={securityDepositBank}
                              onChange={(e) => setSecurityDepositBank(e.target.value)}
                              className="h-9 text-sm border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Cheque/Ref Number
                            </label>
                            <Input
                              placeholder="Reference #"
                              value={securityDepositReference}
                              onChange={(e) => setSecurityDepositReference(e.target.value)}
                              className="h-9 text-sm border-slate-200"
                            />
                          </div>
                        </>
                      )}
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
            disabled={isSubmitting}
          >
            Discard
          </button>

          <div className="flex gap-3 items-center">
            {step === 2 && (
              <Button
                variant="outline"
                className="h-10 px-6 font-bold text-[11px] uppercase tracking-wider"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
            )}

            {step === 1 ? (
              <Button
                className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-widest shadow-md shadow-blue-200"
                onClick={() => {
                  if (!customerId) {
                    toast.error('Please select a customer first');
                    return;
                  }
                  if (!quotationType) {
                    toast.error('Please select a quotation category');
                    return;
                  }
                  setStep(2);
                }}
              >
                Next Step
              </Button>
            ) : (
              <Button
                className="h-10 px-8 bg-black hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-widest shadow-md"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Create Quotation
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
