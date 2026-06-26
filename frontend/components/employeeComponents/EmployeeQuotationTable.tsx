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
  UserCheck,
  Wrench,
  Copy,
  Scan,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import api from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { Product } from '@/lib/product';

import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import {
  createInvoice,
  getMyInvoices,
  getInvoiceById,
  employeeApproveInvoice,
  updateInvoiceStatus,
  assignCustomerToQuotation,
  Invoice,
  CreateInvoicePayload,
} from '@/lib/invoice';
import { getBrands, Brand } from '@/lib/brand';
import { getAllModels, Model } from '@/lib/model';

import { QuotationViewDialog } from './QuotationViewDialog';
import RentFormModal from './RentFormModal';
import { InvoiceAccountView } from '../invoice/InvoiceAccountView';
import { getAccountSummary } from '@/lib/payment';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationType = 'RENT' | 'LEASE' | 'PRODUCT_SALE' | 'SPAREPART_SALE';

interface Consumable {
  partName: string;
  description: string;
  yield: string;
  price: string;
}

interface SaleItem {
  description: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  discount: number;
  maxDiscount: number;
  isManual: boolean;
  productId?: string;
  sparePartId?: string;
  modelId?: string;
  brand?: string;
  model?: string;
  productName?: string;
  hsCode?: string;
  itemType: 'PRODUCT' | 'SPAREPART';
  warranty?: string;
  isEditable: boolean;
  availableStock?: number;
  bwIncludedLimit?: number;
  colorIncludedLimit?: number;
  combinedIncludedLimit?: number;
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;
  bwSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  colorSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  comboSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  bwRateUpTo100k?: string;
  colorRateUpTo100k?: string;
  comboRateUpTo100k?: string;
  useBwRateUpTo100k?: boolean;
  useColorRateUpTo100k?: boolean;
  useComboRateUpTo100k?: boolean;
  consumables?: Consumable[];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-600',
    SENT_TO_CUSTOMER: 'bg-blue-100 text-blue-600',
    ACCEPTED: 'bg-green-100 text-green-700',
    CUSTOMER_ACCEPTED: 'bg-green-100 text-green-700',
    APPROVED: 'bg-green-100 text-green-700',
    FINANCE_APPROVED: 'bg-green-100 text-green-700',
    EMPLOYEE_APPROVED: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    FINANCE_REJECTED: 'bg-red-100 text-red-700',
    CUSTOMER_REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE_LEASE: 'bg-green-100 text-green-700',
    ACTIVE_CONTRACT: 'bg-green-100 text-green-700',
    INVOICED: 'bg-blue-100 text-blue-600',
    CANCELLED: 'bg-slate-100 text-slate-600',
    WAITING_FINANCE_APPROVAL: 'bg-amber-100 text-amber-700',
    TRANSACTION_COMPLETED: 'bg-green-100 text-green-700 font-bold border-green-200',
    ASSIGNED: 'bg-indigo-100 text-indigo-700',
    RETAKEN: 'bg-red-100 text-red-700',
  };

  const label: Record<string, string> = {
    ASSIGNED: 'PENDING CUSTOMER ASSIGNMENT',
    RETAKEN: 'RETAKEN BY MANAGER',
    DRAFT: 'DRAFT (IN PREPARATION)',
    SENT: 'SENT TO CUSTOMER',
    SENT_TO_CUSTOMER: 'SENT TO CUSTOMER',
    EMPLOYEE_APPROVED: 'SENT TO FINANCE',
    FINANCE_APPROVED: 'APPROVED BY FINANCE',
    FINANCE_REJECTED: 'REJECTED BY FINANCE',
    CUSTOMER_ACCEPTED: 'ACCEPTED BY CUSTOMER',
    CUSTOMER_REJECTED: 'REJECTED BY CUSTOMER',
    ACCEPTED: 'APPROVED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING_CONFIRMATION: 'PENDING ALLOCATION',
    TRANSACTION_COMPLETED: 'ACCOUNTING COMPLETED',
    PAID: 'FULLY PAID',
    ACTIVE_LEASE: 'ACTIVE',
    ACTIVE_CONTRACT: 'ACTIVE',
    INVOICED: 'INVOICED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    WAITING_FINANCE_APPROVAL: 'WAITING FINANCE APPROVAL',
  };

  return (
    <Badge
      className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none ${map[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {label[status] ?? status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    PRODUCT_SALE: 'bg-blue-50 text-blue-600 border-blue-200',
    SPAREPART_SALE: 'bg-teal-50 text-teal-600 border-teal-200 whitespace-nowrap',
    RENT: 'bg-green-50 text-green-600 border-green-200',
    LEASE: 'bg-purple-50 text-purple-600 border-purple-200',
  };
  const labels: Record<string, string> = {
    PRODUCT_SALE: 'PRODUCT SALE',
    SPAREPART_SALE: 'SPARE PARTS SALE',
    RENT: 'RENT',
    LEASE: 'LEASE',
  };
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider ${map[type] ?? ''}`}
    >
      {labels[type] ?? type}
    </Badge>
  );
}

function ConvertedBadge({ q }: { q: Invoice }) {
  if (q.isConverted) {
    return (
      <Badge className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-green-200">
        Converted
      </Badge>
    );
  }
  const isExpired = q.expiryDate ? new Date(q.expiryDate) < new Date() : false;
  if (
    ['EXPIRED', 'CUSTOMER_REJECTED', 'FINANCE_REJECTED', 'RETAKEN', 'SUPERSEDED'].includes(
      q.status,
    ) ||
    isExpired
  ) {
    return (
      <Badge className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-red-200">
        Not Converted
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-yellow-200">
      Pending
    </Badge>
  );
}

const getRemainingDays = (expiryDate?: string | Date) => {
  if (!expiryDate) return 'N/A';
  const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays} days remaining` : 'Expired';
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeQuotationTable() {
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [rentLeaseModal, setRentLeaseModal] = useState<{
    open: boolean;
    type: 'RENT' | 'LEASE';
    customerId: string;
  }>({ open: false, type: 'RENT', customerId: '' });
  const [viewOpen, setViewOpen] = useState(false);
  const [accountViewOpen, setAccountViewOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<Invoice | null>(null);
  const [sourceQuotationData, setSourceQuotationData] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [conversionFilter, setConversionFilter] = useState<
    'ALL' | 'CONVERTED' | 'NOT_CONVERTED' | 'PENDING' | 'EXPIRED'
  >('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINANCE_APPROVED' | 'SENT_TO_CUSTOMER'>(
    'ALL',
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeJob, setEmployeeJob] = useState<EmployeeJob | null | undefined>(null);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allModels, setAllModels] = useState<Model[]>([]);

  const [assignCustomerOpen, setAssignCustomerOpen] = useState(false);
  const [assignCustomerQId, setAssignCustomerQId] = useState<string | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignCustomerNotes, setAssignCustomerNotes] = useState('');
  const [submittingAssignCustomer, setSubmittingAssignCustomer] = useState(false);

  const [newFromExistingOpen, setNewFromExistingOpen] = useState(false);
  const [newFromExistingCustomerId, setNewFromExistingCustomerId] = useState('');
  const [newFromExistingNotes, setNewFromExistingNotes] = useState('');
  const [submittingNewFromExisting, setSubmittingNewFromExisting] = useState(false);

  const handleAssignCustomerSubmit = async () => {
    if (!assignCustomerQId || !assignCustomerId) {
      toast.error('Please select a customer.');
      return;
    }
    setSubmittingAssignCustomer(true);
    try {
      await assignCustomerToQuotation(assignCustomerQId, {
        customerId: assignCustomerId,
        notes: assignCustomerNotes,
      });
      toast.success('Customer assigned successfully. Quotation is now in DRAFT.');
      setAssignCustomerOpen(false);
      fetchQuotations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign customer.');
    } finally {
      setSubmittingAssignCustomer(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const [brandsData, modelsData] = await Promise.all([
          getBrands(),
          getAllModels({ limit: 1000 }),
        ]);
        setAllBrands(Array.isArray(brandsData.data) ? brandsData.data : []);
        setAllModels(modelsData.data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };
    fetchSuggestions();
  }, []);

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
  }, [search, conversionFilter, statusFilter, startDate, endDate, setPage]);

  // Stats
  const total_q = quotations.length;
  const accepted_q = quotations.filter((q) =>
    [
      'ACCEPTED',
      'CUSTOMER_ACCEPTED',
      'APPROVED',
      'FINANCE_APPROVED',
      'PAID',
      'ACTIVE_LEASE',
      'ACTIVE_CONTRACT',
      'ISSUED',
      'INVOICED',
      'TRANSACTION_COMPLETED',
      'PENDING_CONFIRMATION',
      'SENT_TO_CUSTOMER',
    ].includes(q.status),
  ).length;
  const rejected_q = quotations.filter(
    (q) =>
      q.status === 'REJECTED' ||
      q.status === 'CUSTOMER_REJECTED' ||
      q.status === 'FINANCE_REJECTED',
  ).length;

  // ── Product name helpers (must be defined before `filtered`) ────────────
  const getCleanProductName = useCallback((name: string) => {
    let clean = name.replace(/^(Black & White - |Color - |Combined - )/i, '');
    clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\)|\s*\(Serial[^)]+\))/gi, '');
    const lastDashIndex = clean.lastIndexOf(' - ');
    if (lastDashIndex !== -1 && clean.length - lastDashIndex < 25) {
      clean = clean.substring(0, lastDashIndex).trim();
    }
    return clean.trim();
  }, []);

  const getProductNames = useCallback(
    (invoice: Invoice) => {
      if (!invoice.items || invoice.items.length === 0) return 'No items';
      const productItems = invoice.items.filter(
        (item) => item.itemType !== 'PRICING_RULE' && item.description,
      );
      if (productItems.length === 0) {
        const allWithDesc = invoice.items.filter((item) => item.description);
        if (allWithDesc.length === 0) return 'N/A';
        return allWithDesc.map((item) => getCleanProductName(item.description)).join(', ');
      }
      return productItems.map((item) => getCleanProductName(item.description)).join(', ');
    },
    [getCleanProductName],
  );

  // Filter
  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();

    // Search match
    const searchMatch =
      q.invoiceNumber?.toLowerCase().includes(s) ||
      q.invoiceNumber?.toLowerCase().replace('inv-', 'qty-').includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      getProductNames(q).toLowerCase().includes(s) ||
      q.saleType?.toLowerCase().includes(s) ||
      q.status?.toLowerCase().includes(s);

    // Conversion filter match
    let conversionMatch = true;
    const isExpired = q.expiryDate ? new Date(q.expiryDate) < new Date() : false;
    if (conversionFilter === 'CONVERTED') {
      conversionMatch = !!q.isConverted;
    } else if (conversionFilter === 'NOT_CONVERTED') {
      conversionMatch =
        !q.isConverted &&
        (['EXPIRED', 'CUSTOMER_REJECTED', 'FINANCE_REJECTED', 'RETAKEN', 'SUPERSEDED'].includes(
          q.status,
        ) ||
          isExpired);
    } else if (conversionFilter === 'PENDING') {
      conversionMatch =
        !q.isConverted &&
        !isExpired &&
        !['EXPIRED', 'CUSTOMER_REJECTED', 'FINANCE_REJECTED', 'RETAKEN', 'SUPERSEDED'].includes(
          q.status,
        );
    } else if (conversionFilter === 'EXPIRED') {
      conversionMatch = isExpired || q.status === 'EXPIRED';
    }

    // Status filter match
    let statusMatch = true;
    if (statusFilter === 'FINANCE_APPROVED') {
      statusMatch = q.status === 'FINANCE_APPROVED';
    } else if (statusFilter === 'SENT_TO_CUSTOMER') {
      statusMatch = q.status === 'SENT' || q.status === 'SENT_TO_CUSTOMER';
    }

    // Date range match
    let dateMatch = true;
    if (startDate) {
      dateMatch = dateMatch && new Date(q.createdAt) >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch = dateMatch && new Date(q.createdAt) <= end;
    }

    return searchMatch && conversionMatch && statusMatch && dateMatch;
  });

  useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  const paginatedIds = useMemo(() => {
    return paginated.map((q) => q.id).join(',');
  }, [paginated]);

  useEffect(() => {
    if (!paginatedIds) return;
    const fetchVisibleBalances = async () => {
      try {
        const promises = paginated.map(async (q) => {
          try {
            const summary = await getAccountSummary(q.id);
            return { id: q.id, pendingBalance: summary.pendingBalance };
          } catch {
            return { id: q.id, pendingBalance: q.totalAmount }; // fallback
          }
        });
        const results = await Promise.all(promises);
        setBalances((prev) => {
          const newBalances = { ...prev };
          results.forEach((res) => {
            newBalances[res.id] = res.pendingBalance;
          });
          return newBalances;
        });
      } catch (err) {
        console.error('Error fetching visible balances:', err);
      }
    };
    fetchVisibleBalances();
  }, [paginatedIds, paginated]);

  const handleView = async (id: string) => {
    try {
      const data = await getInvoiceById(id);
      setSelectedQ(data);
      setViewOpen(true);
    } catch {
      toast.error('Failed to load quotation details.');
    }
  };

  const handleCreateNewFromExisting = async (id: string) => {
    try {
      const data = await getInvoiceById(id);
      setSourceQuotationData(data);
      setNewFromExistingCustomerId('');
      setNewFromExistingNotes('');
      setNewFromExistingOpen(true);
    } catch {
      toast.error('Failed to load quotation details.');
    }
  };

  const handleNewFromExistingSubmit = async () => {
    if (!sourceQuotationData || !newFromExistingCustomerId) {
      toast.error('Please select a customer.');
      return;
    }
    setSubmittingNewFromExisting(true);
    try {
      // Helper to parse description tags
      const parseDescriptionTags = (desc: string) => {
        let clean = desc || '';

        let style: string | null = null;
        if (clean.includes('[STD]')) {
          style = 'standard';
          clean = clean.replace('[STD]', '');
        } else if (clean.includes('[PRM]')) {
          style = 'premium';
          clean = clean.replace('[PRM]', '');
        }

        let brand = '';
        let model = '';
        let productName = '';
        let hsCode = '';
        let isManual = false;

        const bnMatch = clean.match(/\[BN:([^\]]*)\]/);
        if (bnMatch) {
          brand = bnMatch[1];
          isManual = true;
          clean = clean.replace(/\[BN:[^\]]*\]/, '');
        }
        const mnMatch = clean.match(/\[MN:([^\]]*)\]/);
        if (mnMatch) {
          model = mnMatch[1];
          isManual = true;
          clean = clean.replace(/\[MN:[^\]]*\]/, '');
        }
        const pnMatch = clean.match(/\[PN:([^\]]*)\]/);
        if (pnMatch) {
          productName = pnMatch[1];
          isManual = true;
          clean = clean.replace(/\[PN:[^\]]*\]/, '');
        }
        const hsMatch = clean.match(/\[HS:([^\]]*)\]/);
        if (hsMatch) {
          hsCode = hsMatch[1];
          isManual = true;
          clean = clean.replace(/\[HS:[^\]]*\]/, '');
        }

        let discountTag: number | undefined = undefined;
        const discMatch = clean.match(/\[DISC:([^\]]*)\]/);
        if (discMatch) {
          discountTag = Number(discMatch[1]) || 0;
          clean = clean.replace(/\[DISC:[^\]]*\]/, '');
        }

        const consumables: Consumable[] = [];
        const consMatches = clean.match(/\[CONS:([^\]]*)\]/g);
        if (consMatches) {
          consMatches.forEach((m) => {
            const inner = m.substring(6, m.length - 1);
            const parts = inner.split('|');
            consumables.push({
              partName: parts[0] || '',
              description: parts[1] || '',
              yield: parts[2] || '',
              price: parts[3] || '',
            });
          });
          clean = clean.replace(/\[CONS:[^\]]*\]/g, '');
        }

        return {
          cleanDescription: clean.trim(),
          style,
          brand,
          model,
          productName,
          hsCode,
          isManual,
          discountTag,
          consumables,
        };
      };

      const sType = sourceQuotationData.saleType as QuotationType;

      let baseNotes = sourceQuotationData.notes || '';
      let styleTag = '';
      const styleMatch = baseNotes.match(/\[STYLE:([^\]]*)\]/);
      if (styleMatch) {
        styleTag = `[STYLE:${styleMatch[1]}]`;
        baseNotes = baseNotes.replace(/\[STYLE:[^\]]*\]/g, '').trim();
      }

      let finalNotes = newFromExistingNotes ? newFromExistingNotes.trim() : baseNotes;
      if (styleTag) {
        finalNotes = `${styleTag} ${finalNotes}`.trim();
      }

      // Map items
      const mappedItems = (sourceQuotationData.items || []).map((item) => {
        const parsed = parseDescriptionTags(item.description);

        let desc = parsed.cleanDescription;
        if (parsed.brand) desc = `[BN:${parsed.brand}] ${desc}`;
        if (parsed.model) desc = `[MN:${parsed.model}] ${desc}`;
        if (parsed.productName) desc = `[PN:${parsed.productName}] ${desc}`;
        if (parsed.hsCode) desc = `[HS:${parsed.hsCode}] ${desc}`;
        if (parsed.discountTag) desc = `[DISC:${parsed.discountTag}] ${desc}`;

        if (parsed.consumables && parsed.consumables.length > 0) {
          parsed.consumables.forEach((c) => {
            const part = (c.partName || '').replace(/\|/g, ' ');
            const d = (c.description || '').replace(/\|/g, ' ');
            const y = (c.yield || '').replace(/\|/g, ' ');
            const p = (c.price || '').replace(/\|/g, ' ');
            desc = `[CONS:${part}|${d}|${y}|${p}] ${desc}`;
          });
        }

        const mappedSlabs = (ranges?: Array<{ from: number; to: number; rate: number }>) => {
          if (!ranges) return [];
          return ranges.map((r) => ({
            from: r.from,
            to: r.to,
            rate: r.rate,
          }));
        };

        return {
          description: desc,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          discount: item.discount || 0,
          productId: item.productId,
          modelId: item.modelId,
          itemType: item.itemType || 'PRODUCT',

          bwIncludedLimit: item.bwIncludedLimit,
          colorIncludedLimit: item.colorIncludedLimit,
          combinedIncludedLimit: item.combinedIncludedLimit,
          bwExcessRate: item.bwExcessRate,
          colorExcessRate: item.colorExcessRate,
          combinedExcessRate: item.combinedExcessRate,

          bwSlabRanges: mappedSlabs(item.bwSlabRanges),
          colorSlabRanges: mappedSlabs(item.colorSlabRanges),
          comboSlabRanges: mappedSlabs(item.comboSlabRanges),
        };
      });

      const payload: CreateInvoicePayload = {
        customerId: newFromExistingCustomerId,
        saleType: sType,
        notes: finalNotes,
        items: mappedItems,
      };

      if (sType === 'RENT') {
        payload.rentType = sourceQuotationData.rentType as CreateInvoicePayload['rentType'];
        payload.rentPeriod = sourceQuotationData.rentPeriod as CreateInvoicePayload['rentPeriod'];
        payload.monthlyRent = sourceQuotationData.monthlyRent;
        payload.advanceAmount = sourceQuotationData.advanceAmount;
        payload.discountPercent = sourceQuotationData.discountPercent;
        payload.effectiveFrom = sourceQuotationData.effectiveFrom;
        payload.effectiveTo = sourceQuotationData.effectiveTo;
      } else if (sType === 'LEASE') {
        payload.leaseType = sourceQuotationData.leaseType as CreateInvoicePayload['leaseType'];
        payload.leaseTenureMonths = sourceQuotationData.leaseTenureMonths;
        payload.totalLeaseAmount = sourceQuotationData.totalLeaseAmount;
        payload.monthlyEmiAmount = sourceQuotationData.monthlyEmiAmount;
      }

      if (sourceQuotationData.securityDepositAmount) {
        payload.securityDepositAmount = sourceQuotationData.securityDepositAmount;
        payload.securityDepositMode =
          sourceQuotationData.securityDepositMode as CreateInvoicePayload['securityDepositMode'];
        payload.securityDepositReference = sourceQuotationData.securityDepositReference;
        payload.securityDepositBank = sourceQuotationData.securityDepositBank;
      }

      const newQ = await createInvoice(payload);
      setQuotations((prev) => [newQ, ...prev]);
      setNewFromExistingOpen(false);
      setSourceQuotationData(null);
      toast.success('New quotation created successfully from existing quotation.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create new quotation.');
    } finally {
      setSubmittingNewFromExisting(false);
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

  const handleStatusChange = async (status: string) => {
    if (!selectedQ) return;
    try {
      await updateInvoiceStatus(selectedQ.id, status);
      toast.success(`Quotation marked as ${status}`);
      setViewOpen(false);
      fetchQuotations();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || `Failed to update status to ${status}`);
    }
  };

  // Called after successful conversion — refreshes table and closes dialog
  const handleConvertSuccess = () => {
    setViewOpen(false);
    fetchQuotations();
    toast.success('Quotation converted successfully! Invoice is now active.');
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
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={16} /> Add Quotation
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by number, customer, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <Select
              value={conversionFilter}
              onValueChange={(val: string) =>
                setConversionFilter(
                  val as 'ALL' | 'CONVERTED' | 'NOT_CONVERTED' | 'PENDING' | 'EXPIRED',
                )
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Conversion Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Conversion Statuses</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="NOT_CONVERTED">Not Converted</SelectItem>
                <SelectItem value="PENDING">Pending Conversion</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onValueChange={(val: string) =>
                setStatusFilter(val as 'ALL' | 'FINANCE_APPROVED' | 'SENT_TO_CUSTOMER')
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Workflow Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Workflow Statuses</SelectItem>
                <SelectItem value="FINANCE_APPROVED">Finance Approved</SelectItem>
                <SelectItem value="SENT_TO_CUSTOMER">Sent to Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">FROM:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs p-2"
            />
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">TO:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs p-2"
            />
          </div>
        </div>

        {(search ||
          conversionFilter !== 'ALL' ||
          statusFilter !== 'ALL' ||
          startDate ||
          endDate) && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                setSearch('');
                setConversionFilter('ALL');
                setStatusFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[750px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-primary font-bold">QTY NUMBER</TableHead>
                <TableHead className="text-primary font-bold">PRODUCT</TableHead>
                <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
                <TableHead className="text-primary font-bold">PRICE</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">BALANCE</TableHead>
                <TableHead className="text-primary font-bold">DATE</TableHead>
                <TableHead className="text-primary font-bold">CONVERTED</TableHead>
                <TableHead className="text-primary font-bold">EXPIRY DATE</TableHead>
                <TableHead className="text-primary font-bold">VALIDITY</TableHead>
                <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-14 text-muted-foreground">
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
                      {q.invoiceNumber?.replace('INV-', 'QTY-')}
                    </TableCell>
                    <TableCell
                      className="font-semibold text-slate-700 max-w-[200px] truncate"
                      title={getProductNames(q)}
                    >
                      {getProductNames(q)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {q.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(q.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={q.saleType} />
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      {balances[q.id] !== undefined ? (
                        formatCurrency(balances[q.id])
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {new Date(q.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <ConvertedBadge q={q} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <span
                        className={
                          q.expiryDate && new Date(q.expiryDate) < new Date()
                            ? 'text-red-600 font-bold'
                            : 'text-slate-700'
                        }
                      >
                        {q.expiryDate
                          ? new Date(q.expiryDate).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <span
                        className={
                          getRemainingDays(q.expiryDate) === 'Expired'
                            ? 'text-red-500 font-bold'
                            : 'text-slate-600'
                        }
                      >
                        {getRemainingDays(q.expiryDate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleView(q.id)}
                          title="View Quotation"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleCreateNewFromExisting(q.id)}
                          title="Create New from this"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {q.status === 'ASSIGNED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setAssignCustomerQId(q.id);
                              setAssignCustomerId('');
                              setAssignCustomerNotes('');
                              setAssignCustomerOpen(true);
                            }}
                            title="Assign Customer"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {q.status === 'RETAKEN' && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase select-none">
                            Locked
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
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
          initialData={sourceQuotationData}
          onClose={() => {
            setFormOpen(false);
            setSourceQuotationData(null);
          }}
          onConfirm={handleCreate}
          allowedTypes={allowedTypes}
          allBrands={allBrands}
          allModels={allModels}
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
          onStatusChange={handleStatusChange}
          onSendToFinance={handleSendToFinance}
          onConvertSuccess={handleConvertSuccess}
          onCreateNewFromExisting={handleCreateNewFromExisting}
          showDistribution={true}
        />
      )}
      {accountViewOpen && selectedQ && (
        <InvoiceAccountView
          invoiceId={selectedQ.id}
          open={accountViewOpen}
          onClose={() => setAccountViewOpen(false)}
        />
      )}
      {assignCustomerOpen && assignCustomerQId && (
        <Dialog open={assignCustomerOpen} onOpenChange={setAssignCustomerOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-xl shadow-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                Assign Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                To activate this assigned quotation template, select the customer and provide
                optional notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Customer
                </label>
                <CustomerSelect value={assignCustomerId} onChange={setAssignCustomerId} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Internal Notes / Remarks
                </label>
                <Textarea
                  value={assignCustomerNotes}
                  onChange={(e) => setAssignCustomerNotes(e.target.value)}
                  placeholder="Enter notes about this assignment..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setAssignCustomerOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignCustomerSubmit}
                disabled={submittingAssignCustomer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5"
              >
                {submittingAssignCustomer ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {newFromExistingOpen && sourceQuotationData && (
        <Dialog open={newFromExistingOpen} onOpenChange={setNewFromExistingOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-xl shadow-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                Assign Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                To activate this assigned quotation template, select the customer and provide
                optional notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Customer
                </label>
                <CustomerSelect
                  value={newFromExistingCustomerId}
                  onChange={setNewFromExistingCustomerId}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Internal Notes / Remarks
                </label>
                <Textarea
                  value={newFromExistingNotes}
                  onChange={(e) => setNewFromExistingNotes(e.target.value)}
                  placeholder="Enter notes about this assignment..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setNewFromExistingOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNewFromExistingSubmit}
                disabled={submittingNewFromExisting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5"
              >
                {submittingNewFromExisting ? 'Creating...' : 'Confirm Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
  allBrands,
  allModels,
  initialData,
}: {
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void>;
  allowedTypes: QuotationType[];
  allBrands: Brand[];
  allModels: Model[];
  initialData?: Invoice | null;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeCategory, setActiveCategory] = useState<'SALE' | 'RENT' | 'LEASE' | null>(null);
  const [quotationType, setQuotationType] = useState<QuotationType>(
    allowedTypes[0] ?? 'PRODUCT_SALE',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLayoutCategory, setSelectedLayoutCategory] = useState<string | null>('product');
  const [selectedLayoutStyle] = useState<string | null>('normal');

  // ── SALE state ──────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [scanQuery, setScanQuery] = useState('');

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
  const [leaseTenureMonths, setLeaseTenureMonths] = useState('12');
  const [totalLeaseAmount, setTotalLeaseAmount] = useState('');
  const [monthlyEmiAmount, setMonthlyEmiAmount] = useState('');

  // ── WARRANTY state ──────────────────────────────────────────────────────
  const [warrantyType, setWarrantyType] = useState<'none' | 'duration' | 'copies'>('none');
  const [warrantyDurationValue, setWarrantyDurationValue] = useState('');
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<'months' | 'years'>('months');
  const [warrantyCopyLimit, setWarrantyCopyLimit] = useState('');

  const [lastEditedLease, setLastEditedLease] = useState<'TOTAL' | 'PERIODIC'>('TOTAL');

  // ── SECURITY DEPOSIT state ──────────────────────────────────────────────
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');
  const [securityDepositMode, setSecurityDepositMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [securityDepositReference, setSecurityDepositReference] = useState('');
  const [securityDepositBank, setSecurityDepositBank] = useState('');

  useEffect(() => {
    if (!initialData) return;

    // Helper to parse description tags
    const parseDescriptionTags = (desc: string) => {
      let clean = desc || '';

      let style: string | null = null;
      if (clean.includes('[STD]')) {
        style = 'standard';
        clean = clean.replace('[STD]', '');
      } else if (clean.includes('[PRM]')) {
        style = 'premium';
        clean = clean.replace('[PRM]', '');
      }

      let brand = '';
      let model = '';
      let productName = '';
      let hsCode = '';
      let isManual = false;

      const bnMatch = clean.match(/\[BN:([^\]]*)\]/);
      if (bnMatch) {
        brand = bnMatch[1];
        isManual = true;
        clean = clean.replace(/\[BN:[^\]]*\]/, '');
      }
      const mnMatch = clean.match(/\[MN:([^\]]*)\]/);
      if (mnMatch) {
        model = mnMatch[1];
        isManual = true;
        clean = clean.replace(/\[MN:[^\]]*\]/, '');
      }
      const pnMatch = clean.match(/\[PN:([^\]]*)\]/);
      if (pnMatch) {
        productName = pnMatch[1];
        isManual = true;
        clean = clean.replace(/\[PN:[^\]]*\]/, '');
      }
      const hsMatch = clean.match(/\[HS:([^\]]*)\]/);
      if (hsMatch) {
        hsCode = hsMatch[1];
        isManual = true;
        clean = clean.replace(/\[HS:[^\]]*\]/, '');
      }

      let discountTag: number | undefined = undefined;
      const discMatch = clean.match(/\[DISC:([^\]]*)\]/);
      if (discMatch) {
        discountTag = Number(discMatch[1]) || 0;
        clean = clean.replace(/\[DISC:[^\]]*\]/, '');
      }

      const consumables: Consumable[] = [];
      const consMatches = clean.match(/\[CONS:([^\]]*)\]/g);
      if (consMatches) {
        consMatches.forEach((m) => {
          const inner = m.substring(6, m.length - 1);
          const parts = inner.split('|');
          consumables.push({
            partName: parts[0] || '',
            description: parts[1] || '',
            yield: parts[2] || '',
            price: parts[3] || '',
          });
        });
        clean = clean.replace(/\[CONS:[^\]]*\]/g, '');
      }

      return {
        cleanDescription: clean.trim(),
        style,
        brand,
        model,
        productName,
        hsCode,
        isManual,
        discountTag,
        consumables,
      };
    };

    const sType = initialData.saleType as QuotationType;
    setQuotationType(sType);

    if (['PRODUCT_SALE', 'SPAREPART_SALE'].includes(sType)) {
      setActiveCategory('SALE');
      setSelectedLayoutCategory('product');
    } else if (sType === 'RENT') {
      setActiveCategory('RENT');
      setSelectedLayoutCategory('rental');
    } else if (sType === 'LEASE') {
      setActiveCategory('LEASE');
      setSelectedLayoutCategory('lease');
    }

    setCustomerId(initialData.customerId || '');

    let rawNotes = initialData.notes || '';
    if (rawNotes.includes('[STYLE:')) {
      rawNotes = rawNotes.replace(/\[STYLE:[^\]]*\]/g, '').trim();
    }
    setNotes(rawNotes);

    if (initialData.rentType) setRentType(initialData.rentType);
    if (initialData.rentPeriod) setRentPeriod(initialData.rentPeriod);
    if (initialData.monthlyRent) setMonthlyRent(String(initialData.monthlyRent));
    if (initialData.advanceAmount) setAdvanceAmount(String(initialData.advanceAmount));
    if (initialData.discountPercent) setDiscountPercent(String(initialData.discountPercent));
    if (initialData.effectiveFrom) {
      setEffectiveFrom(initialData.effectiveFrom.split('T')[0]);
    }
    if (initialData.effectiveTo) {
      setEffectiveTo(initialData.effectiveTo.split('T')[0]);
      if (initialData.effectiveFrom) {
        const fromD = new Date(initialData.effectiveFrom);
        const toD = new Date(initialData.effectiveTo);
        const months =
          (toD.getFullYear() - fromD.getFullYear()) * 12 + toD.getMonth() - fromD.getMonth();
        if (months > 0) setDurationMonths(String(months));
      }
    }

    if (initialData.leaseType) setLeaseType(initialData.leaseType);
    if (initialData.leaseTenureMonths) setLeaseTenureMonths(String(initialData.leaseTenureMonths));
    if (initialData.totalLeaseAmount) setTotalLeaseAmount(String(initialData.totalLeaseAmount));
    if (initialData.monthlyEmiAmount) setMonthlyEmiAmount(String(initialData.monthlyEmiAmount));

    // Warranty initial mapping
    if (initialData.warrantyType)
      setWarrantyType(initialData.warrantyType as 'none' | 'duration' | 'copies');
    if (initialData.warrantyDurationValue)
      setWarrantyDurationValue(String(initialData.warrantyDurationValue));
    if (initialData.warrantyDurationUnit)
      setWarrantyDurationUnit(initialData.warrantyDurationUnit as 'months' | 'years');
    if (initialData.warrantyCopyLimit) setWarrantyCopyLimit(String(initialData.warrantyCopyLimit));

    if (initialData.securityDepositAmount)
      setSecurityDepositAmount(String(initialData.securityDepositAmount));
    if (initialData.securityDepositMode) {
      setSecurityDepositMode(initialData.securityDepositMode === 'CHEQUE' ? 'CHEQUE' : 'CASH');
    }
    if (initialData.securityDepositReference)
      setSecurityDepositReference(initialData.securityDepositReference);
    if (initialData.securityDepositBank) setSecurityDepositBank(initialData.securityDepositBank);

    if (initialData.items) {
      const mappedItems: SaleItem[] = initialData.items.map((item) => {
        const parsed = parseDescriptionTags(item.description);
        const discountVal = item.discount || parsed.discountTag || 0;
        const basePriceVal = item.unitPrice || 0;
        const finalUnitPrice = basePriceVal - discountVal;

        const mappedSlabs = (ranges?: Array<{ from: number; to: number; rate: number }>) => {
          if (!ranges) return [];
          return ranges.map((r) => ({
            from: String(r.from),
            to: String(r.to),
            rate: String(r.rate),
          }));
        };

        return {
          description: parsed.cleanDescription,
          quantity: item.quantity || 1,
          basePrice: basePriceVal,
          discount: discountVal,
          unitPrice: finalUnitPrice,
          maxDiscount: 0,
          isManual: parsed.isManual,
          productId:
            (item.itemType as string) !== 'SPAREPART' && (item.itemType as string) !== 'SPARE_PART'
              ? item.productId
              : undefined,
          sparePartId:
            (item.itemType as string) === 'SPAREPART' || (item.itemType as string) === 'SPARE_PART'
              ? item.productId
              : undefined,
          modelId: item.modelId,
          itemType: ((item.itemType as string) === 'SPAREPART' ||
          (item.itemType as string) === 'SPARE_PART'
            ? 'SPAREPART'
            : 'PRODUCT') as 'PRODUCT' | 'SPAREPART',
          isEditable: parsed.isManual || !item.productId,

          bwIncludedLimit: item.bwIncludedLimit,
          colorIncludedLimit: item.colorIncludedLimit,
          combinedIncludedLimit: item.combinedIncludedLimit,
          bwExcessRate: item.bwExcessRate,
          colorExcessRate: item.colorExcessRate,
          combinedExcessRate: item.combinedExcessRate,

          bwSlabRanges: mappedSlabs(item.bwSlabRanges),
          colorSlabRanges: mappedSlabs(item.colorSlabRanges),
          comboSlabRanges: mappedSlabs(item.comboSlabRanges),

          brand: parsed.brand,
          model: parsed.model,
          productName: parsed.productName,
          hsCode: parsed.hsCode,
          consumables: parsed.consumables,
        };
      });
      setSaleItems(mappedItems);
    }
  }, [initialData]);

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

  const selectedQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    saleItems.forEach((it) => {
      const id = it.productId || it.sparePartId;
      if (id) {
        map[id] = (map[id] || 0) + it.quantity;
      }
    });
    return map;
  }, [saleItems]);

  const [activeItemTab, setActiveItemTab] = useState<'PRODUCT' | 'SPAREPART'>('PRODUCT');

  // Synchronize activeItemTab with quotationType
  useEffect(() => {
    if (quotationType === 'SPAREPART_SALE') {
      setActiveItemTab('SPAREPART');
    } else {
      setActiveItemTab('PRODUCT');
    }
  }, [quotationType]);

  // ── Sale item helpers ────────────────────────────────────────────────────
  const addItem = (item: SelectableItem) => {
    let description = '',
      basePrice = 0,
      maxDiscount = 0,
      itemType: 'PRODUCT' | 'SPAREPART' = 'PRODUCT',
      productId: string | undefined = undefined,
      sparePartId: string | undefined = undefined,
      modelId: string | undefined = undefined,
      warranty = '',
      consumables: Consumable[] = [];

    const isSparePart = 'part_name' in item;
    let availableStock = 1;

    if (isSparePart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sp = item as any;
      description = sp.part_name || 'Spare Part';
      basePrice = Number(sp.base_price) || 0;
      maxDiscount = Number(sp.max_discount_amount) || 0;
      sparePartId = sp.id;
      itemType = 'SPAREPART';
      availableStock = typeof sp.quantity === 'number' ? sp.quantity : 999999;
    } else {
      const pr = item as Product;
      description = pr.name || pr.description || pr.model?.description || 'Product';

      basePrice = pr.sale_price || 0;
      maxDiscount = pr.max_discount_amount || 0;
      productId = pr.id;
      modelId = pr.model?.id;
      itemType = 'PRODUCT';
      warranty = pr.warranty || '';
      consumables = pr.consumables
        ? pr.consumables.map(
            (c: {
              partName?: string;
              description?: string;
              yield?: string;
              price?: string | number;
            }) => ({
              partName: c.partName || '',
              description: c.description || '',
              yield: c.yield || '',
              price: String(c.price || ''),
            }),
          )
        : [];
      const isAvailable = !pr.product_status || pr.product_status === 'AVAILABLE';
      if (!isAvailable) {
        availableStock = 0;
      } else {
        availableStock =
          typeof (pr as unknown as { stock?: number }).stock === 'number'
            ? (pr as unknown as { stock?: number }).stock!
            : 1;
      }
    }

    const existingIdx = saleItems.findIndex((existing) => {
      if (isSparePart) {
        return (
          !existing.isManual &&
          existing.sparePartId === sparePartId &&
          existing.itemType === 'SPAREPART'
        );
      } else {
        return (
          !existing.isManual && existing.productId === productId && existing.itemType === 'PRODUCT'
        );
      }
    });

    if (existingIdx > -1) {
      const currentQty = saleItems[existingIdx].quantity;
      if (currentQty >= availableStock) {
        toast.error(`Cannot add more. Only ${availableStock} item(s) available in inventory.`);
        return;
      }
      setSaleItems((prev) => {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      });
      toast.success(`Incremented quantity for ${description}`);
      return;
    }

    if (availableStock <= 0) {
      toast.error(`Item is out of stock.`);
      return;
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
        sparePartId,
        modelId,
        itemType,
        isEditable: isSparePart ? false : !productId || basePrice === 0,
        availableStock,
        bwSlabRanges: [],
        colorSlabRanges: [],
        comboSlabRanges: [],
        warranty,
        consumables,
      },
    ]);
    toast.success(`Added ${description}`);
  };

  const removeItem = (i: number) => setSaleItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleBarcodeScan = async (code: string) => {
    try {
      const response = await api.get(`/i/inventory/scan?code=${code}`);
      const { type, item, warning } = response.data;

      if (warning) {
        toast.warning(warning);
      }

      if (type === 'PRODUCT') {
        if (quotationType === 'SPAREPART_SALE') {
          toast.error('Cannot add products to a Spare Parts Sale quotation.');
          return;
        }
        const pr = item as Product;
        const exists = saleItems.some((si) => si.productId === pr.id);
        if (exists) {
          toast.warning(`Product "${pr.name}" (SN: ${pr.serial_no}) has already been added.`);
          return;
        }
        addItem(pr);
      } else if (type === 'SPARE_PART') {
        if (quotationType !== 'SPAREPART_SALE') {
          toast.error('Cannot add spare parts to a Product/Service/Agreement quotation.');
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sp = item as any;
        const existingIndex = saleItems.findIndex((si) => si.sparePartId === sp.id);
        if (existingIndex > -1) {
          setSaleItems((prev) => {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1,
            };
            return updated;
          });
          toast.success(`Incremented quantity for "${sp.part_name || 'Spare Part'}"`);
        } else {
          addItem(sp);
        }
      }
    } catch (err: unknown) {
      toast.error('Scan failed', {
        description:
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (err as Error).message,
      });
    }
  };

  const addManualItem = () => {
    setSaleItems((prev) => [
      ...prev,
      {
        description: '',
        brand: '',
        model: '',
        productName: '',
        hsCode: '',
        quantity: 1,
        basePrice: 0,
        discount: 0,
        unitPrice: 0,
        maxDiscount: 0,
        isManual: true,
        productId: undefined,
        modelId: undefined,
        itemType: 'PRODUCT',
        isEditable: true,
        bwSlabRanges: [],
        colorSlabRanges: [],
        comboSlabRanges: [],
        useBwRateUpTo100k: false,
        useColorRateUpTo100k: false,
        useComboRateUpTo100k: false,
        bwRateUpTo100k: '',
        colorRateUpTo100k: '',
        comboRateUpTo100k: '',
      },
    ]);
    toast.info('Added custom item row');
  };

  const renderSlabSection = (
    itemIndex: number,
    title: string,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
    slabs: SaleItem['bwSlabRanges'],
    toggleField: keyof SaleItem,
    isToggleOn: boolean,
    rateField: keyof SaleItem,
    rateValue: string,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-gray-100/50 px-3 py-2 rounded-lg border border-slate-200/50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            {title}
          </span>
          <button
            onClick={() => updateItem(itemIndex, toggleField, !isToggleOn)}
            className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight transition-all shadow-sm ${
              isToggleOn
                ? 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-700'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {isToggleOn ? '✓ Fixed Rate (0-100K) ON' : '+ Enable Fixed Rate (0-100K)'}
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-black text-blue-600 px-3 bg-white border-blue-100 hover:bg-blue-50 hover:border-blue-200 shadow-sm gap-2"
          onClick={() => addSlab(itemIndex, type)}
        >
          <Plus size={12} className="stroke-[3]" /> Add Slab
        </Button>
      </div>

      {isToggleOn && (
        <div className="flex gap-4 items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex-1">
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
              Fixed Rate Up To 100K
            </p>
            <p className="text-[9px] text-blue-400 font-bold italic mt-0.5">
              (Applies to usage from 0 to 100,000 units)
            </p>
          </div>
          <div className="relative w-32">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300 pointer-events-none">
              QAR
            </span>
            <Input
              placeholder="0.00"
              type="number"
              value={rateValue || ''}
              onChange={(e) => updateItem(itemIndex, rateField, e.target.value)}
              className="h-9 text-xs font-black text-blue-700 bg-white border-blue-200 focus:ring-2 focus:ring-blue-500/20 pr-10 text-right"
            />
          </div>
          <div className="w-8 shrink-0" /> {/* Spacer for alignment */}
        </div>
      )}

      {slabs && slabs.length > 0 && (
        <div className="space-y-2 mt-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-3 mb-1">
            <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              From
            </div>
            <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              To
            </div>
            <div className="col-span-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-2">
              Rate per Page (QAR)
            </div>
            <div className="col-span-1" />
          </div>

          {slabs.map((slab, sIdx) => (
            <div
              key={`${type}-${sIdx}`}
              className="group flex gap-2 items-center bg-white p-1 rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="grid grid-cols-12 gap-3 flex-1 items-center">
                <div className="col-span-3">
                  <Input
                    placeholder="0"
                    type="number"
                    value={slab.from}
                    onChange={(e) => updateSlab(itemIndex, type, sIdx, 'from', e.target.value)}
                    className="h-9 text-xs font-bold bg-slate-50/50 border-slate-100 focus:bg-white text-center"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="∞"
                    type={slab.to === '1000000' ? 'text' : 'number'}
                    value={slab.to === '1000000' ? 'UNLIMITED' : slab.to}
                    onChange={(e) => updateSlab(itemIndex, type, sIdx, 'to', e.target.value)}
                    className={`h-9 text-xs font-bold text-center border-slate-100 ${
                      slab.to === '1000000'
                        ? 'text-blue-600 bg-blue-50 border-blue-100'
                        : 'bg-slate-50/50 focus:bg-white'
                    }`}
                  />
                </div>
                <div className="col-span-5 relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none group-hover:text-blue-300">
                    QAR
                  </span>
                  <Input
                    placeholder="0.00"
                    type="number"
                    value={slab.rate}
                    onChange={(e) => updateSlab(itemIndex, type, sIdx, 'rate', e.target.value)}
                    className="h-9 text-xs font-black text-blue-600 bg-blue-50/30 border-blue-50 focus:bg-white text-right pr-10"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeSlab(itemIndex, type, sIdx)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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

  const addConsumable = (itemIndex: number) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[itemIndex] };
      item.consumables = [
        ...(item.consumables || []),
        { partName: '', description: '', yield: '', price: '' },
      ];
      items[itemIndex] = item;
      return items;
    });
  };

  const removeConsumable = (itemIndex: number, consumableIndex: number) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[itemIndex] };
      item.consumables = (item.consumables || []).filter((_, i) => i !== consumableIndex);
      items[itemIndex] = item;
      return items;
    });
  };

  const updateConsumable = (
    itemIndex: number,
    consumableIndex: number,
    field: keyof Consumable,
    value: string,
  ) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = { ...items[itemIndex] };
      const current = [...(item.consumables || [])];
      current[consumableIndex] = { ...current[consumableIndex], [field]: value };
      item.consumables = current;
      items[itemIndex] = item;
      return items;
    });
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number | boolean) => {
    setSaleItems((prev) => {
      const items = [...prev];
      const item = items[index];
      if (field === 'quantity') {
        const reqQty = Math.max(1, Number(value));
        const limit = typeof item.availableStock === 'number' ? item.availableStock : 999999;
        if (reqQty > limit) {
          toast.error(`Cannot set quantity to ${reqQty}. Only ${limit} available in inventory.`);
          items[index] = { ...item, quantity: limit };
        } else {
          items[index] = { ...item, quantity: reqQty };
        }
      } else if (field === 'description') items[index] = { ...item, description: String(value) };
      else if (field === 'brand') items[index] = { ...item, brand: String(value) };
      else if (field === 'model') {
        const modelNo = String(value);
        const matchingModel = allModels.find(
          (m) => m.model_no === modelNo && (!item.brand || m.brandRelation?.name === item.brand),
        );
        if (matchingModel) {
          items[index] = {
            ...item,
            model: modelNo,
            productName: matchingModel.product_name || item.productName,
            description: matchingModel.description || item.description,
          };
        } else {
          items[index] = { ...item, model: modelNo };
        }
      } else if (field === 'productName') items[index] = { ...item, productName: String(value) };
      else if (field === 'hsCode') items[index] = { ...item, hsCode: String(value) };
      else if (field === 'discount') {
        let d = Number(value);
        const maxLimit = item.maxDiscount || 0;
        if (d > maxLimit) {
          toast.warning(`Maximum discount allowed is QAR ${maxLimit}`);
          d = maxLimit;
        }
        if (d > item.basePrice) {
          toast.error('Discount cannot exceed price');
          d = item.basePrice;
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
          'bwExcessRate',
          'colorExcessRate',
          'combinedExcessRate',
          'bwRateUpTo100k',
          'colorRateUpTo100k',
          'comboRateUpTo100k',
        ].includes(field as string)
      ) {
        items[index] = { ...item, [field]: Number(value) };
      } else if (
        ['useBwRateUpTo100k', 'useColorRateUpTo100k', 'useComboRateUpTo100k'].includes(
          field as string,
        )
      ) {
        items[index] = { ...item, [field]: !!value };
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
    const lid =
      selectedLayoutCategory && selectedLayoutStyle
        ? `${selectedLayoutCategory}:${selectedLayoutStyle}`
        : undefined;

    if (['PRODUCT_SALE', 'SPAREPART_SALE'].includes(quotationType)) {
      if (saleItems.length === 0) {
        toast.error('Please add at least one item.');
        return;
      }
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + validDays);

      const totalDiscount = saleItems.reduce((s, it) => s + (it.discount || 0) * it.quantity, 0);
      payload = {
        customerId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saleType: quotationType as any,
        layoutId: lid,
        layout_id: lid,
        notes:
          `[STYLE:${selectedLayoutStyle || 'normal'}]` +
          (quotationType === 'PRODUCT_SALE' ? '' : ''),
        discountAmount: totalDiscount,
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: validityDate.toISOString().split('T')[0],
        items: saleItems.map((it, idx) => {
          let desc = it.isManual
            ? `[BN:${it.brand || ''}][MN:${it.model || ''}][PN:${it.productName || ''}][HS:${it.hsCode || ''}] ${it.description || ''}`
            : it.description || 'Product Product';

          if (idx === 0) {
            if (selectedLayoutStyle === 'standard') desc = `[STD] ${desc}`;
            else if (selectedLayoutStyle === 'premium') desc = `[PRM] ${desc}`;
          }

          // Embed discount as a secret tag to prevent backend loss
          if (it.discount && it.discount > 0) {
            desc = `[DISC:${it.discount}] ${desc}`;
          }

          // Embed consumables for Product Sale
          if (quotationType === 'PRODUCT_SALE' && it.consumables && it.consumables.length > 0) {
            it.consumables.forEach((c) => {
              const part = (c.partName || '').replace(/\|/g, ' ');
              const d = (c.description || '').replace(/\|/g, ' ');
              const y = (c.yield || '').replace(/\|/g, ' ');
              const p = (c.price || '').replace(/\|/g, ' ');
              desc = `[CONS:${part}|${d}|${y}|${p}] ${desc}`;
            });
          }

          return {
            description: desc,
            quantity: it.quantity,
            unitPrice: it.basePrice,
            discount: it.discount,
            productId: it.productId,
            sparePartId: it.sparePartId,
            modelId: it.modelId,
            itemType: it.itemType,
            warranty: it.warranty,
          };
        }),
      };
    } else if (quotationType === 'RENT') {
      if (saleItems.length === 0) {
        toast.error('Please add at least one specific machine (Product).');
        return;
      }
      payload = {
        customerId,
        saleType: 'RENT',
        layoutId: lid,
        layout_id: lid,
        notes: `[STYLE:${selectedLayoutStyle || 'normal'}]`,
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

        items: saleItems.map((it, idx) => {
          let desc = it.isManual
            ? [
                it.brand,
                it.model,
                it.productName,
                it.hsCode ? `[HS: ${it.hsCode}]` : '',
                it.description ? `(${it.description})` : '',
              ]
                .filter(Boolean)
                .join(' ')
            : it.description;

          if (idx === 0) {
            if (selectedLayoutStyle === 'standard') desc = `[STD] ${desc}`;
            else if (selectedLayoutStyle === 'premium') desc = `[PRM] ${desc}`;
          }

          return {
            ...it,
            description: desc,
            unitPrice: 0,
            productId: undefined,
            warranty: it.warranty,
          };
        }),
        pricingItems: [],
      };
    } else {
      // LEASE
      if (saleItems.length === 0) {
        toast.error('Please add at least one specific machine (Product).');
        return;
      }
      const lid =
        selectedLayoutCategory && selectedLayoutStyle
          ? `${selectedLayoutCategory}:${selectedLayoutStyle}`
          : undefined;

      payload = {
        customerId,
        saleType: 'LEASE',
        layoutId: lid,
        layout_id: lid,
        notes: `[STYLE:${selectedLayoutStyle || 'normal'}]`,
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

        // Warranty
        warrantyType,
        warrantyDurationValue:
          warrantyType === 'duration' && warrantyDurationValue
            ? Number(warrantyDurationValue)
            : undefined,
        warrantyDurationUnit: warrantyType === 'duration' ? warrantyDurationUnit : undefined,
        warrantyCopyLimit:
          warrantyType === 'copies' && warrantyCopyLimit ? Number(warrantyCopyLimit) : undefined,

        // Warranty
        // For FSM Leases, we need rentType and monthly rent mapped dynamically
        rentType: leaseType === 'FSM' ? (rentType as CreateInvoicePayload['rentType']) : undefined,
        monthlyRent: leaseType === 'FSM' && monthlyRent ? Number(monthlyRent) : undefined,
        monthlyLeaseAmount:
          leaseType === 'FSM' && totalLeaseAmount ? Number(totalLeaseAmount) : undefined,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        items: saleItems.map((it, idx) => {
          let desc = it.isManual
            ? [
                it.brand,
                it.model,
                it.productName,
                it.hsCode ? `[HS: ${it.hsCode}]` : '',
                it.description ? `(${it.description})` : '',
              ]
                .filter(Boolean)
                .join(' ')
            : it.description;

          if (idx === 0) {
            if (selectedLayoutStyle === 'standard') desc = `[STD] ${desc}`;
            else if (selectedLayoutStyle === 'premium') desc = `[PRM] ${desc}`;
          }

          return {
            description: desc,
            quantity: it.quantity,
            unitPrice: 0,
            itemType: it.itemType,
            productId: undefined,
            modelId: it.modelId,
            warranty: it.warranty,
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
                    rentType === 'CPC' || rentType === 'CPC_COMBO'
                      ? [
                          ...(it.useBwRateUpTo100k && it.bwRateUpTo100k
                            ? [{ from: 0, to: 100000, rate: Number(it.bwRateUpTo100k) }]
                            : []),
                          ...(it.bwSlabRanges || []).map((r) => ({
                            from: Number(r.from) || 0,
                            to: Number(r.to) || 0,
                            rate: Number(r.rate) || 0,
                          })),
                        ].filter((s) => s.rate > 0)
                      : undefined,
                  colorSlabRanges:
                    rentType === 'CPC' || rentType === 'CPC_COMBO'
                      ? [
                          ...(it.useColorRateUpTo100k && it.colorRateUpTo100k
                            ? [{ from: 0, to: 100000, rate: Number(it.colorRateUpTo100k) }]
                            : []),
                          ...(it.colorSlabRanges || []).map((r) => ({
                            from: Number(r.from) || 0,
                            to: Number(r.to) || 0,
                            rate: Number(r.rate) || 0,
                          })),
                        ].filter((s) => s.rate > 0)
                      : undefined,
                  comboSlabRanges:
                    rentType === 'CPC' || rentType === 'CPC_COMBO'
                      ? [
                          ...(it.useComboRateUpTo100k && it.comboRateUpTo100k
                            ? [{ from: 0, to: 100000, rate: Number(it.comboRateUpTo100k) }]
                            : []),
                          ...(it.comboSlabRanges || []).map((r) => ({
                            from: Number(r.from) || 0,
                            to: Number(r.to) || 0,
                            rate: Number(r.rate) || 0,
                          })),
                        ].filter((s) => s.rate > 0)
                      : undefined,
                }
              : {}),
          };
        }),
        pricingItems:
          leaseType === 'FSM'
            ? saleItems.map((it) => ({
                description: it.isManual
                  ? [
                      it.brand,
                      it.model,
                      it.productName,
                      it.hsCode ? `[HS: ${it.hsCode}]` : '',
                      it.description ? `(${it.description})` : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : it.description,
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
                  rentType === 'CPC' || rentType === 'CPC_COMBO'
                    ? [
                        ...(it.useBwRateUpTo100k && it.bwRateUpTo100k
                          ? [{ from: 0, to: 100000, rate: Number(it.bwRateUpTo100k) }]
                          : []),
                        ...(it.bwSlabRanges || []).map((r) => ({
                          from: Number(r.from) || 0,
                          to: Number(r.to) || 0,
                          rate: Number(r.rate) || 0,
                        })),
                      ].filter((s) => s.rate > 0)
                    : undefined,
                colorSlabRanges:
                  rentType === 'CPC' || rentType === 'CPC_COMBO'
                    ? [
                        ...(it.useColorRateUpTo100k && it.colorRateUpTo100k
                          ? [{ from: 0, to: 100000, rate: Number(it.colorRateUpTo100k) }]
                          : []),
                        ...(it.colorSlabRanges || []).map((r) => ({
                          from: Number(r.from) || 0,
                          to: Number(r.to) || 0,
                          rate: Number(r.rate) || 0,
                        })),
                      ].filter((s) => s.rate > 0)
                    : undefined,
                comboSlabRanges:
                  rentType === 'CPC' || rentType === 'CPC_COMBO'
                    ? [
                        ...(it.useComboRateUpTo100k && it.comboRateUpTo100k
                          ? [{ from: 0, to: 100000, rate: Number(it.comboRateUpTo100k) }]
                          : []),
                        ...(it.comboSlabRanges || []).map((r) => ({
                          from: Number(r.from) || 0,
                          to: Number(r.to) || 0,
                          rate: Number(r.rate) || 0,
                        })),
                      ].filter((s) => s.rate > 0)
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
      icon: Wrench,
      label: 'Spare Parts Sale',
      color: 'bg-teal-600',
      desc: 'Quotation for spare parts and accessories',
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
                        desc="Full Machines"
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
                          setSelectedLayoutCategory('rental');
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
                          setSelectedLayoutCategory('lease');
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
                        {allowedTypes.includes('PRODUCT_SALE') && (
                          <button
                            onClick={() => {
                              setQuotationType('PRODUCT_SALE');
                              setSelectedLayoutCategory('product');
                            }}
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
                        )}

                        {allowedTypes.includes('SPAREPART_SALE') && (
                          <button
                            onClick={() => {
                              setQuotationType('SPAREPART_SALE');
                              setSelectedLayoutCategory('product');
                            }}
                            className={`border-2 rounded-xl p-4 flex flex-col items-start gap-2 transition-all ${
                              quotationType === 'SPAREPART_SALE'
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 hover:border-teal-300'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg ${quotationType === 'SPAREPART_SALE' ? 'bg-white/60' : 'bg-slate-50'}`}
                            >
                              <Wrench size={18} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold">Spare Parts Sale</p>
                              <p className="text-[10px] opacity-70 mt-0.5">
                                Spare parts and accessories
                              </p>
                            </div>
                          </button>
                        )}
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
                  </div>
                  {/* Barcode Scanner Input */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-0.5">
                      <Scan size={12} className="text-primary animate-pulse" /> Scan Product or
                      Spare Part Barcode
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Scan or enter barcode ID (e.g. XC-P-12345) and press Enter..."
                        value={scanQuery}
                        onChange={(e) => setScanQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (scanQuery.trim()) {
                              handleBarcodeScan(scanQuery.trim());
                              setScanQuery('');
                            }
                          }
                        }}
                        className="bg-white rounded-lg border-slate-200"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (scanQuery.trim()) {
                            handleBarcodeScan(scanQuery.trim());
                            setScanQuery('');
                          }
                        }}
                        className="rounded-lg px-4 shrink-0 font-bold"
                      >
                        Scan
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-card p-2 rounded-xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <ProductSelect
                        onSelect={addItem}
                        mode={activeItemTab}
                        selectedQuantities={selectedQuantities}
                        placeholder={
                          activeItemTab === 'SPAREPART' ? 'Select Spare Part' : 'Select Product'
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addManualItem}
                      className="h-[52px] px-4 rounded-xl border-dashed border-2 border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-all font-bold flex items-center gap-2 shrink-0"
                    >
                      <Plus size={16} /> Custom Item
                    </Button>
                  </div>

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
                            {item.isManual ? (
                              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Brand
                                  </label>
                                  <Input
                                    placeholder="Brand"
                                    list="brand-suggestions"
                                    value={item.brand || ''}
                                    onChange={(e) => updateItem(index, 'brand', e.target.value)}
                                    className="h-9 font-bold text-sm"
                                  />
                                  <datalist id="brand-suggestions">
                                    {allBrands.map((b) => (
                                      <option key={b.id} value={b.name} />
                                    ))}
                                  </datalist>
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Model
                                  </label>
                                  <Input
                                    placeholder="Model"
                                    list={`model-suggestions-${index}`}
                                    value={item.model || ''}
                                    onChange={(e) => updateItem(index, 'model', e.target.value)}
                                    className="h-9 font-bold text-sm"
                                  />
                                  <datalist id={`model-suggestions-${index}`}>
                                    {allModels
                                      .filter(
                                        (m) => !item.brand || m.brandRelation?.name === item.brand,
                                      )
                                      .map((m) => (
                                        <option key={m.id} value={m.model_no} />
                                      ))}
                                  </datalist>
                                </div>
                                <div className="md:col-span-4 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Product Name
                                  </label>
                                  <Input
                                    placeholder="Product Name"
                                    value={item.productName || ''}
                                    onChange={(e) =>
                                      updateItem(index, 'productName', e.target.value)
                                    }
                                    className="h-9 font-bold text-sm"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    HS Code
                                  </label>
                                  <Input
                                    placeholder="HS Code"
                                    value={item.hsCode || ''}
                                    onChange={(e) => updateItem(index, 'hsCode', e.target.value)}
                                    className="h-9 font-bold text-sm"
                                  />
                                </div>

                                <div className="md:col-span-6 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Specifications / Description
                                  </label>
                                  <Textarea
                                    placeholder="Detailed specifications..."
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(index, 'description', e.target.value)
                                    }
                                    className="min-h-[60px] text-sm resize-none bg-slate-50/50"
                                  />
                                </div>
                                {quotationType === 'SPAREPART_SALE' ? (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                                      Quantity
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(index, 'quantity', Number(e.target.value))
                                      }
                                      className="h-9 text-sm bg-slate-50/50 text-center font-bold"
                                    />
                                  </div>
                                ) : (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                                      Warranty
                                    </label>
                                    <Input
                                      placeholder="e.g. 1 Year"
                                      value={item.warranty}
                                      onChange={(e) =>
                                        updateItem(index, 'warranty', e.target.value)
                                      }
                                      className="h-9 text-sm bg-slate-50/50"
                                    />
                                  </div>
                                )}
                                <div className="md:col-span-2 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase text-right block">
                                    Rate
                                  </label>
                                  <Input
                                    type="number"
                                    value={item.basePrice}
                                    onChange={(e) => updateItem(index, 'basePrice', e.target.value)}
                                    className="h-9 text-right font-bold"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase text-center block">
                                    Discount
                                  </label>
                                  <Input
                                    type="number"
                                    value={item.discount === 0 ? '' : item.discount}
                                    placeholder="0"
                                    onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                    className="h-9 text-center font-bold"
                                  />
                                </div>
                                <div className="md:col-span-2 flex flex-col items-end justify-center h-9 mt-auto">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    Net
                                  </p>
                                  <p className="font-extrabold text-foreground">
                                    {formatCurrency(item.quantity * item.unitPrice)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="md:col-span-4 space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                                    Description
                                  </label>
                                  <Input
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(index, 'description', e.target.value)
                                    }
                                    readOnly={!item.isManual}
                                    className={`h-9 font-bold text-sm ${!item.isManual ? 'bg-muted/50 border-transparent' : ''}`}
                                  />
                                </div>

                                {item.itemType === 'SPAREPART' ? (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                                      Quantity
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(index, 'quantity', Number(e.target.value))
                                      }
                                      className="h-9 text-sm bg-slate-50/50 text-center font-bold"
                                    />
                                  </div>
                                ) : (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                                      Warranty
                                    </label>
                                    <Input
                                      placeholder="e.g. 1 Year"
                                      value={item.warranty}
                                      onChange={(e) =>
                                        updateItem(index, 'warranty', e.target.value)
                                      }
                                      className="h-9 text-sm bg-slate-50/50"
                                    />
                                  </div>
                                )}

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
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    Net
                                  </p>
                                  <p className="font-extrabold text-foreground">
                                    {formatCurrency(item.quantity * item.unitPrice)}
                                  </p>
                                </div>
                              </>
                            )}
                            {/* Replacement Consumables Section */}
                            {quotationType === 'PRODUCT_SALE' && (
                              <div className="md:col-span-12 mt-2 pt-2 border-t border-slate-100">
                                <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200/60 transition-all hover:bg-slate-50">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-blue-100 p-1.5 rounded-lg">
                                        <ShoppingCart size={14} className="text-blue-600" />
                                      </div>
                                      <div>
                                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                                          Replacement Consumables
                                        </h5>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                          (Optional add-ons for this product)
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addConsumable(index)}
                                      className="h-8 text-[11px] font-black uppercase text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 gap-2 shadow-sm"
                                    >
                                      <span className="text-lg">+</span> Add Part
                                    </Button>
                                  </div>

                                  {item.consumables && item.consumables.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-3 mb-1">
                                        <div className="md:col-span-3 text-[9px] font-black text-slate-400 uppercase">
                                          Part Name
                                        </div>
                                        <div className="md:col-span-4 text-[9px] font-black text-slate-400 uppercase">
                                          Specifications
                                        </div>
                                        <div className="md:col-span-3 text-[9px] font-black text-slate-400 uppercase text-center">
                                          Yield
                                        </div>
                                        <div className="md:col-span-2 text-[9px] font-black text-slate-400 uppercase text-right">
                                          Price (QAR)
                                        </div>
                                      </div>

                                      {item.consumables.map((cons, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group animate-in fade-in slide-in-from-top-1 duration-200"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => removeConsumable(index, cIdx)}
                                            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white shadow-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                          >
                                            <Trash2 size={12} />
                                          </button>

                                          <div className="md:col-span-3">
                                            <Input
                                              placeholder="e.g. Toner Cartridge"
                                              value={cons.partName}
                                              onChange={(e) =>
                                                updateConsumable(
                                                  index,
                                                  cIdx,
                                                  'partName',
                                                  e.target.value,
                                                )
                                              }
                                              className="h-9 text-xs font-bold bg-slate-50/30 border-slate-200 focus:bg-white"
                                            />
                                          </div>
                                          <div className="md:col-span-4">
                                            <Input
                                              placeholder="Specs..."
                                              value={cons.description}
                                              onChange={(e) =>
                                                updateConsumable(
                                                  index,
                                                  cIdx,
                                                  'description',
                                                  e.target.value,
                                                )
                                              }
                                              className="h-9 text-xs font-bold bg-slate-50/30 border-slate-200 focus:bg-white"
                                            />
                                          </div>
                                          <div className="md:col-span-3">
                                            <Input
                                              placeholder="e.g. 20K Pages"
                                              value={cons.yield}
                                              onChange={(e) =>
                                                updateConsumable(
                                                  index,
                                                  cIdx,
                                                  'yield',
                                                  e.target.value,
                                                )
                                              }
                                              className="h-9 text-xs font-bold text-center bg-slate-50/30 border-slate-200 focus:bg-white"
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <Input
                                              type="number"
                                              placeholder="0.00"
                                              value={cons.price}
                                              onChange={(e) =>
                                                updateConsumable(
                                                  index,
                                                  cIdx,
                                                  'price',
                                                  e.target.value,
                                                )
                                              }
                                              className="h-9 text-xs font-black text-right text-blue-700 bg-blue-50/30 border-blue-100 focus:bg-white"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                                        No Consumables Added
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id)) return;
                        addItem(item);
                      }}
                      placeholder="Select Product"
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
                                    {renderSlabSection(
                                      index,
                                      'Black & White Slabs',
                                      'bwSlabRanges',
                                      m.bwSlabRanges,
                                      'useBwRateUpTo100k',
                                      !!m.useBwRateUpTo100k,
                                      'bwRateUpTo100k',
                                      m.bwRateUpTo100k || '',
                                    )}
                                    {/* Color Slabs */}
                                    {renderSlabSection(
                                      index,
                                      'Color Slabs',
                                      'colorSlabRanges',
                                      m.colorSlabRanges,
                                      'useColorRateUpTo100k',
                                      !!m.useColorRateUpTo100k,
                                      'colorRateUpTo100k',
                                      m.colorRateUpTo100k || '',
                                    )}
                                  </div>
                                )}
                                {rentType === 'CPC_COMBO' && (
                                  <div className="space-y-4 mt-2">
                                    {renderSlabSection(
                                      index,
                                      'Combined Slabs',
                                      'comboSlabRanges',
                                      m.comboSlabRanges,
                                      'useComboRateUpTo100k',
                                      !!m.useComboRateUpTo100k,
                                      'comboRateUpTo100k',
                                      m.comboRateUpTo100k || '',
                                    )}
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
                    {rentType !== 'CPC' && rentType !== 'CPC_COMBO' && (
                      <>
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
                            Advance / Caution Deposit (QAR)
                          </label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={advanceAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdvanceAmount(val);
                              setSecurityDepositAmount(val);
                            }}
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
                      </>
                    )}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-purple-200 shadow-sm space-y-2 bg-purple-50/30 min-w-0 w-full">
                      <label className="text-[11px] font-bold text-purple-600 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" /> Lease Type
                      </label>
                      <Select
                        value={leaseType}
                        onValueChange={(v) => setLeaseType(v as 'EMI' | 'FSM')}
                      >
                        <SelectTrigger className="h-9 text-sm border-purple-100 w-full">
                          <SelectValue placeholder="Select Lease Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMI">EMI (Equated Monthly Instalment)</SelectItem>
                          <SelectItem value="FSM">FSM (Full Service Maintenance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-slate-100 shadow-sm space-y-2 min-w-0 w-full">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Billing Period
                      </label>
                      <Select value={rentPeriod} onValueChange={setRentPeriod}>
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {leaseType === 'FSM' && (
                      <div className="bg-card p-4 rounded-xl border border-blue-200 shadow-sm space-y-2 bg-blue-50/30 min-w-0 w-full">
                        <label className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" /> Service Billing Type
                          (FSM)
                        </label>
                        <Select value={rentType} onValueChange={setRentType}>
                          <SelectTrigger className="h-9 text-sm border-blue-100 w-full">
                            <SelectValue placeholder="Select Billing Type" />
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
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id)) return;
                        addItem(item);
                      }}
                      placeholder="Select Product"
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
                                    {renderSlabSection(
                                      index,
                                      'Black & White Slabs',
                                      'bwSlabRanges',
                                      m.bwSlabRanges,
                                      'useBwRateUpTo100k',
                                      !!m.useBwRateUpTo100k,
                                      'bwRateUpTo100k',
                                      m.bwRateUpTo100k || '',
                                    )}
                                    {/* Color Slabs */}
                                    {renderSlabSection(
                                      index,
                                      'Color Slabs',
                                      'colorSlabRanges',
                                      m.colorSlabRanges,
                                      'useColorRateUpTo100k',
                                      !!m.useColorRateUpTo100k,
                                      'colorRateUpTo100k',
                                      m.colorRateUpTo100k || '',
                                    )}
                                  </div>
                                )}
                                {rentType === 'CPC_COMBO' && (
                                  <div className="space-y-2 mt-2">
                                    {renderSlabSection(
                                      index,
                                      'Combined Slabs',
                                      'comboSlabRanges',
                                      m.comboSlabRanges,
                                      'useComboRateUpTo100k',
                                      !!m.useComboRateUpTo100k,
                                      'comboRateUpTo100k',
                                      m.comboRateUpTo100k || '',
                                    )}
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
                        onChange={(e) => {
                          setLeaseTenureMonths(e.target.value);
                          setDurationMonths(e.target.value);
                        }}
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
                    {rentType !== 'CPC' && rentType !== 'CPC_COMBO' && (
                      <>
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
                            Advance / Caution Deposit (QAR)
                          </label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={advanceAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdvanceAmount(val);
                              setSecurityDepositAmount(val);
                            }}
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
                      </>
                    )}
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
                          onChange={(e) => {
                            setDurationMonths(e.target.value);
                            setLeaseTenureMonths(e.target.value);
                          }}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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

                  {/* Section 4: Lease Warranty (Conditional) */}
                  <div className="bg-card p-5 rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-600 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Warranty
                        Configuration
                      </label>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                        LEASE SPECIFIC
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Warranty Type
                        </label>
                        <Select
                          value={warrantyType}
                          onValueChange={(v) =>
                            setWarrantyType(v as 'none' | 'duration' | 'copies')
                          }
                        >
                          <SelectTrigger className="h-9 text-sm border-amber-100 bg-white shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Warranty</SelectItem>
                            <SelectItem value="duration">By Duration (Time-based)</SelectItem>
                            <SelectItem value="copies">By Count of Copies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {warrantyType === 'duration' && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Value
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 6"
                              value={warrantyDurationValue}
                              onChange={(e) => setWarrantyDurationValue(e.target.value)}
                              className="h-9 text-sm border-amber-100 shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Unit
                            </label>
                            <Select
                              value={warrantyDurationUnit}
                              onValueChange={(v) =>
                                setWarrantyDurationUnit(v as 'months' | 'years')
                              }
                            >
                              <SelectTrigger className="h-9 text-sm border-amber-100 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="months">Months</SelectItem>
                                <SelectItem value="years">Years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {warrantyType === 'copies' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Warranty Copy Limit (Total)
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g. 100000"
                            value={warrantyCopyLimit}
                            onChange={(e) => setWarrantyCopyLimit(e.target.value)}
                            className="h-9 text-sm border-amber-100 shadow-sm"
                          />
                        </div>
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
