'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Send,
  Wallet,
  Package,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
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
import { normalizeCopiedRate, normalizeCopiedSlabRanges } from '@/lib/quotationCopy';

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
  wholesalePrice?: number;
  retailPrice?: number;
  // Added alongside a Rent/Lease machine, not as the machine itself — e.g. a stand, tray,
  // or stapler unit supplied with the rented/leased device. Priced and billed once (with
  // the first month advance), never metered — no reading/pricing-config UI is shown for it.
  isAccessory?: boolean;
  imageUrl?: string;
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
  bwExcessRate?: string;
  colorExcessRate?: string;
  combinedExcessRate?: string;
  // Separate A3/A4 pricing (Lease FSM + CPC only). When on, the A3 rate fields below
  // replace the a3Multiplier conversion — A3 pages bill 1:1 at their own rate.
  separateA3Pricing?: boolean;
  bwA3ExcessRate?: string;
  colorA3ExcessRate?: string;
  // Transient: set once the user edits an A3 rate by hand, which stops it from being
  // re-derived when the matching A4 rate changes. Never sent to the backend.
  bwA3RateTouched?: boolean;
  colorA3RateTouched?: boolean;
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
    DRAFT: 'bg-muted text-foreground',
    SENT: 'bg-primary/10 text-primary',
    SENT_TO_CUSTOMER: 'bg-primary/10 text-primary',
    ACCEPTED: 'bg-success/10 text-success',
    CUSTOMER_ACCEPTED: 'bg-success/10 text-success',
    APPROVED: 'bg-success/10 text-success',
    FINANCE_APPROVED: 'bg-success/10 text-success',
    EMPLOYEE_APPROVED: 'bg-warning/10 text-warning',
    REJECTED: 'bg-destructive/10 text-destructive',
    FINANCE_REJECTED: 'bg-destructive/10 text-destructive',
    CUSTOMER_REJECTED: 'bg-destructive/10 text-destructive',
    EXPIRED: 'bg-warning/10 text-warning',
    PENDING: 'bg-warning/10 text-warning',
    PAID: 'bg-success/10 text-success',
    ACTIVE_LEASE: 'bg-success/10 text-success',
    ACTIVE_CONTRACT: 'bg-success/10 text-success',
    INVOICED: 'bg-primary/10 text-primary',
    CANCELLED: 'bg-muted text-foreground',
    WAITING_FINANCE_APPROVAL: 'bg-warning/10 text-warning',
    TRANSACTION_COMPLETED: 'bg-success/10 text-success font-bold border-success/30',
    ASSIGNED: 'bg-primary/10 text-primary',
    RETAKEN: 'bg-destructive/10 text-destructive',
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
      className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none ${map[status] ?? 'bg-muted text-foreground'}`}
    >
      {label[status] ?? status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    PRODUCT_SALE: 'bg-primary/10 text-primary border-primary/30',
    SPAREPART_SALE: 'bg-info/10 text-info border-info/30 whitespace-nowrap',
    RENT: 'bg-success/10 text-success border-success/30',
    LEASE: 'bg-lease/10 text-lease border-lease/30',
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
      <Badge className="bg-success/10 text-success rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-success/30">
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
      <Badge className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-destructive/30">
        Not Converted
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/10 text-warning rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none uppercase border-warning/30">
      Pending
    </Badge>
  );
}

const getRemainingDays = (expiryDate?: string | Date) => {
  if (!expiryDate) return 'N/A';
  const parsed = new Date(expiryDate);
  if (isNaN(parsed.getTime())) return 'N/A';
  const diffTime = parsed.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays} days remaining` : 'Expired';
};

// Allows valid decimal intermediate states (e.g. "0.", "0.2", "0.20") without
// converting to a number mid-entry, which would strip the decimal point.
const handleDecimalInput = (val: string): string | undefined => {
  if (val === '') return '';
  if (/^\d*\.?\d*$/.test(val)) return val;
  return undefined;
};

// Clicks an A3 page costs relative to an A4 one. Matches the backend's default
// a3Multiplier, so seeding an A3 rate this way starts the quote at exactly the money
// the multiplier would have billed before the rates were split.
const A3_RATE_FACTOR = 2;

// Seeds an A3 excess rate from its A4 counterpart. Returns the field untouched (blank)
// when the A4 rate isn't a usable number yet, rather than writing a misleading 0.
const deriveA3Rate = (a4Rate?: string): string => {
  const base = Number(a4Rate);
  if (!a4Rate || Number.isNaN(base) || base <= 0) return '';
  return String(Number((base * A3_RATE_FACTOR).toFixed(4)));
};

const safeFormatDate = (
  dateVal: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales: string | string[] = 'en-US',
) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return 'N/A';
    }
    return d.toLocaleDateString(locales, options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeQuotationTable() {
  const currency = useBranchCurrency();
  const [quotations, setQuotations] = useState<Invoice[]>([]);
  const [sendingQuotationIds, setSendingQuotationIds] = useState<Set<string>>(new Set());
  const sendingQuotationIdsRef = useRef(new Set<string>());
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
  // Memoized: this must NOT be a new array reference on every render. `paginated`
  // below is a useMemo keyed on `filtered`, and the balance-fetching effect further
  // down is keyed on `paginated` itself (not just the derived id string) — an
  // unmemoized `.filter()` here made both recompute every render, which made that
  // effect re-fire every render, whose own setState triggered the next render:
  // an infinite loop hitting GET /payments/summary for the visible page's invoices
  // many times per second, silently burning through the per-user rate-limit budget
  // in the background for as long as this table stayed mounted (e.g. behind the
  // New Quotation wizard) — the actual cause of "Too many requests" on submit.
  const filtered = useMemo(() => {
    return quotations.filter((q) => {
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
      const createdTime = q.createdAt ? new Date(q.createdAt).getTime() : NaN;
      if (!isNaN(createdTime)) {
        if (startDate) {
          const startD = new Date(startDate);
          if (!isNaN(startD.getTime())) {
            dateMatch = dateMatch && createdTime >= startD.getTime();
          }
        }
        if (endDate) {
          const endD = new Date(endDate);
          if (!isNaN(endD.getTime())) {
            endD.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && createdTime <= endD.getTime();
          }
        }
      } else if (startDate || endDate) {
        dateMatch = false;
      }

      return searchMatch && conversionMatch && statusMatch && dateMatch;
    });
  }, [quotations, search, conversionFilter, statusFilter, startDate, endDate, getProductNames]);

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
          bwExcessRate: normalizeCopiedRate(item.bwExcessRate),
          colorExcessRate: normalizeCopiedRate(item.colorExcessRate),
          combinedExcessRate: normalizeCopiedRate(item.combinedExcessRate),
          separateA3Pricing: !!item.separateA3Pricing,
          bwA3ExcessRate: normalizeCopiedRate(item.bwA3ExcessRate),
          colorA3ExcessRate: normalizeCopiedRate(item.colorA3ExcessRate),
          bwA3RateTouched: item.bwA3ExcessRate != null,
          colorA3RateTouched: item.colorA3ExcessRate != null,

          bwSlabRanges: normalizeCopiedSlabRanges(item.bwSlabRanges),
          colorSlabRanges: normalizeCopiedSlabRanges(item.colorSlabRanges),
          comboSlabRanges: normalizeCopiedSlabRanges(item.comboSlabRanges),
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
        payload.items = mappedItems.filter((item) => item.itemType !== 'PRICING_RULE');
        const rentPricingRows = mappedItems.filter((item) => item.itemType === 'PRICING_RULE');
        const rentMachineRows = mappedItems.filter(
          (item) => item.itemType !== 'PRICING_RULE' && item.itemType !== 'ACCESSORY',
        );
        payload.pricingItems = (rentPricingRows.length > 0 ? rentPricingRows : rentMachineRows).map(
          (item) => ({
            description: item.description,
            bwIncludedLimit: item.bwIncludedLimit,
            colorIncludedLimit: item.colorIncludedLimit,
            combinedIncludedLimit: item.combinedIncludedLimit,
            bwExcessRate: item.bwExcessRate !== undefined ? Number(item.bwExcessRate) : undefined,
            colorExcessRate:
              item.colorExcessRate !== undefined ? Number(item.colorExcessRate) : undefined,
            combinedExcessRate:
              item.combinedExcessRate !== undefined ? Number(item.combinedExcessRate) : undefined,
            separateA3Pricing: item.separateA3Pricing,
            bwA3ExcessRate:
              item.bwA3ExcessRate !== undefined ? Number(item.bwA3ExcessRate) : undefined,
            colorA3ExcessRate:
              item.colorA3ExcessRate !== undefined ? Number(item.colorA3ExcessRate) : undefined,
            bwSlabRanges: item.bwSlabRanges,
            colorSlabRanges: item.colorSlabRanges,
            comboSlabRanges: item.comboSlabRanges,
          }),
        );
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
    if (sendingQuotationIdsRef.current.has(id)) return;
    sendingQuotationIdsRef.current.add(id);
    setSendingQuotationIds((prev) => new Set(prev).add(id));
    try {
      const updated = await employeeApproveInvoice(id);
      setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
      setSelectedQ((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
      toast.success('Quotation sent to Finance team!');
      setViewOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send to finance.');
    } finally {
      sendingQuotationIdsRef.current.delete(id);
      setSendingQuotationIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
          <h2 className="text-xl font-medium text-primary">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage customer quotations</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            className="bg-primary text-primary-foreground gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={16} /> Add Quotation
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
            <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap">
              FROM:
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs p-2"
            />
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap">
              TO:
            </span>
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
              className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-border p-4">
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
                    className={`${index % 2 ? 'bg-primary/10' : 'bg-card'} hover:bg-muted/50 transition-colors`}
                  >
                    <TableCell className="text-primary font-bold tracking-tight">
                      {q.invoiceNumber?.replace('INV-', 'QTY-')}
                    </TableCell>
                    <TableCell
                      className="font-semibold text-foreground max-w-[200px] truncate"
                      title={getProductNames(q)}
                    >
                      {getProductNames(q)}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {q.customerName || 'Walk-in'}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(q.totalAmount, currency)}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={q.saleType} />
                    </TableCell>
                    <TableCell className="font-bold text-destructive">
                      {balances[q.id] !== undefined ? (
                        formatCurrency(balances[q.id], currency)
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {safeFormatDate(q.createdAt, {
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
                            ? 'text-destructive font-bold'
                            : 'text-foreground'
                        }
                      >
                        {safeFormatDate(q.expiryDate, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <span
                        className={
                          getRemainingDays(q.expiryDate) === 'Expired'
                            ? 'text-destructive font-bold'
                            : 'text-foreground'
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
                          className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleView(q.id)}
                          title="View Quotation"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-warning hover:text-warning hover:bg-warning/10"
                          onClick={() => handleCreateNewFromExisting(q.id)}
                          title="Create New from this"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {(q.status === 'DRAFT' || q.status === 'FINANCE_REJECTED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-70"
                            onClick={() => handleSendToFinance(q.id)}
                            disabled={sendingQuotationIds.has(q.id)}
                            title={
                              sendingQuotationIds.has(q.id)
                                ? 'Sending to Finance…'
                                : 'Send to Finance'
                            }
                            aria-label={
                              sendingQuotationIds.has(q.id)
                                ? 'Sending to Finance'
                                : 'Send to Finance'
                            }
                          >
                            {sendingQuotationIds.has(q.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {q.status === 'ASSIGNED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
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
                          <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/30 uppercase select-none">
                            Locked
                          </span>
                        )}
                        {q.type === 'PROFORMA' &&
                          ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(q.saleType || '') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                              onClick={() => {
                                setSelectedQ(q);
                                setAccountViewOpen(true);
                              }}
                              title="Record Advance Payment (sent to Finance for approval)"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
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
          gated
          onClose={() => setAccountViewOpen(false)}
        />
      )}
      {assignCustomerOpen && assignCustomerQId && (
        <Dialog open={assignCustomerOpen} onOpenChange={setAssignCustomerOpen}>
          <DialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                Assign Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                To activate this assigned quotation template, select the customer and provide
                optional notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Select Customer
                </label>
                <CustomerSelect
                  value={assignCustomerId}
                  onChange={setAssignCustomerId}
                  customersOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
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
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignCustomerSubmit}
                disabled={submittingAssignCustomer}
                className="bg-success hover:bg-success/90 text-success-foreground font-bold text-xs uppercase tracking-wider px-5"
              >
                {submittingAssignCustomer ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {newFromExistingOpen && sourceQuotationData && (
        <Dialog open={newFromExistingOpen} onOpenChange={setNewFromExistingOpen}>
          <DialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                Assign Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                To activate this assigned quotation template, select the customer and provide
                optional notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Select Customer
                </label>
                <CustomerSelect
                  value={newFromExistingCustomerId}
                  onChange={setNewFromExistingCustomerId}
                  customersOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
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
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNewFromExistingSubmit}
                disabled={submittingNewFromExisting}
                className="bg-success hover:bg-success/90 text-success-foreground font-bold text-xs uppercase tracking-wider px-5"
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
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-foreground">
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h4 className="font-bold text-sm text-foreground">{label}</h4>
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
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
  const currency = useBranchCurrency();
  const [step, setStep] = useState<1 | 2>(1);
  const [activeCategory, setActiveCategory] = useState<'SALE' | 'RENT' | 'LEASE' | null>(null);
  const [quotationType, setQuotationType] = useState<QuotationType>(
    allowedTypes[0] ?? 'PRODUCT_SALE',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLayoutCategory, setSelectedLayoutCategory] = useState<string | null>('product');
  const [selectedLayoutStyle] = useState<string | null>('normal');

  // ── SALE state ──────────────────────────────────────────────────────────
  const [transactionType, setTransactionType] = useState<'B2B' | 'B2C'>('B2C');
  const [customerId, setCustomerId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [scanQuery, setScanQuery] = useState('');

  // ── RENT state ──────────────────────────────────────────────────────────
  const [rentType, setRentType] = useState('FIXED_LIMIT');
  const [rentPeriod, setRentPeriod] = useState('MONTHLY');
  const [monthlyRent, setMonthlyRent] = useState('');

  // CPC / CPC_COMBO billing is per-copy, not a periodic rent — Monthly Rent must be
  // cleared when switching to either, so a stale value from a previous FIXED_* selection
  // can't get silently carried over and sent to the backend (which rejects monthlyRent
  // > 0 for CPC models). Used by both the RENT and LEASE-FSM billing-type selectors.
  const handleRentTypeChange = (value: string) => {
    setRentType(value);
    if (value === 'CPC' || value === 'CPC_COMBO') {
      setMonthlyRent('');
      // CPC bills for copies actually made, so the charge for a period cannot be known
      // until that period has run — there is no fixed rent to collect up front. Force
      // postpaid, and clear any advance already typed: the advance field is hidden
      // under ARREARS, so a figure left in state would be submitted invisibly against
      // a contract that has no advance.
      setPaymentTiming('ARREARS');
      setAdvanceAmount('');
      setAdvanceEdited(false);
    }
  };
  const [advanceAmount, setAdvanceAmount] = useState('');
  // The first month's advance is one period's rent, so it mirrors the rent as it is
  // typed. The mirroring must STOP the moment the user types their own figure — a
  // customer can agree an advance that differs from the monthly rent, and silently
  // overwriting that would be worse than not prefilling at all. Held as state rather
  // than a ref because the edit-load effect also sets it, which the React Compiler
  // rightly refuses on a ref.
  const [advanceEdited, setAdvanceEdited] = useState(false);
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
  // Default warranty across SALE/RENT/LEASE: 2 years OR 200000 copies, whichever
  // first. Staff can still override per-quotation; `warrantyManuallySet` tracks
  // whether they (or a product's own warranty data) already have, so the
  // baseline default doesn't stomp on either.
  const [warrantyType, setWarrantyType] = useState<'none' | 'duration' | 'copies' | 'both'>('both');
  const [warrantyDurationValue, setWarrantyDurationValue] = useState('2');
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<'months' | 'years'>('years');
  const [warrantyCopyLimit, setWarrantyCopyLimit] = useState('200000');
  const [warrantyManuallySet, setWarrantyManuallySet] = useState(false);

  const [lastEditedLease, setLastEditedLease] = useState<'TOTAL' | 'PERIODIC'>('TOTAL');

  // ── PAYMENT TIMING state ───────────────────────────────────────────────
  const [paymentTiming, setPaymentTiming] = useState<'ADVANCE' | 'ARREARS'>('ADVANCE');

  // ── SECURITY DEPOSIT state ──────────────────────────────────────────────
  const [securityDepositAmount, setSecurityDepositAmount] = useState('');
  const [securityDepositMode, setSecurityDepositMode] = useState<
    'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
  >('CASH');
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
    if (initialData.advanceAmount) {
      // Editing an existing quotation: its advance is a saved figure, not a mirror, so
      // retyping the rent must not overwrite it.
      setAdvanceEdited(true);
      setAdvanceAmount(String(initialData.advanceAmount));
    }
    if (initialData.discountPercent) setDiscountPercent(String(initialData.discountPercent));
    if (initialData.paymentTiming)
      setPaymentTiming(initialData.paymentTiming as 'ADVANCE' | 'ARREARS');
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
    if (initialData.warrantyType) {
      setWarrantyType(initialData.warrantyType as 'none' | 'duration' | 'copies' | 'both');
      setWarrantyManuallySet(true);
    }
    if (initialData.warrantyDurationValue)
      setWarrantyDurationValue(String(initialData.warrantyDurationValue));
    if (initialData.warrantyDurationUnit)
      setWarrantyDurationUnit(initialData.warrantyDurationUnit as 'months' | 'years');
    if (initialData.warrantyCopyLimit) setWarrantyCopyLimit(String(initialData.warrantyCopyLimit));

    if (initialData.securityDepositAmount)
      setSecurityDepositAmount(String(initialData.securityDepositAmount));
    if (initialData.securityDepositMode) {
      const mode = initialData.securityDepositMode;
      setSecurityDepositMode(
        mode === 'CHEQUE' ? 'CHEQUE' : mode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH',
      );
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
          bwExcessRate: normalizeCopiedRate(item.bwExcessRate),
          colorExcessRate: normalizeCopiedRate(item.colorExcessRate),
          combinedExcessRate: normalizeCopiedRate(item.combinedExcessRate),
          separateA3Pricing: !!item.separateA3Pricing,
          bwA3ExcessRate: normalizeCopiedRate(item.bwA3ExcessRate),
          colorA3ExcessRate: normalizeCopiedRate(item.colorA3ExcessRate),
          bwA3RateTouched: item.bwA3ExcessRate != null,
          colorA3RateTouched: item.colorA3ExcessRate != null,

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
      // CPC / CPC_COMBO billing is per-copy, not a periodic rent — Monthly Rent must
      // stay empty (and unsent) for these, matching the backend's rejection of
      // monthlyRent > 0 for CPC models. Skip the auto-calc entirely for these types
      // so entering Total Lease Amount can't silently repopulate it.
      if (rentType === 'CPC' || rentType === 'CPC_COMBO') return;

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
    rentType,
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

  // Accessories supplied alongside a Rent/Lease machine — priced items, billed once with
  // the first month advance, never metered. Kept in the same saleItems array as the
  // machines (isAccessory flags which is which) so add/remove/update infra is shared.
  const accessoryItems = useMemo(() => saleItems.filter((it) => it.isAccessory), [saleItems]);
  const accessoryTotal = useMemo(
    () => accessoryItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0),
    [accessoryItems],
  );

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
  // Prefill the warranty configuration from the product's stored warranty
  // (e.g. "2 Years" + max pages) unless the user (or a prior product) already
  // set one — the baseline 2yr/200000-copy default doesn't count as "set".
  const applyProductWarrantyDefaults = (pr: Product) => {
    if (warrantyManuallySet) return;
    const durationMatch = (pr.warranty || '').match(/(\d+)\s*(year|month)/i);
    const maxPages = pr.warranty_max_pages;
    if (!durationMatch && !maxPages) return;
    if (durationMatch) {
      setWarrantyDurationValue(durationMatch[1]);
      setWarrantyDurationUnit(
        durationMatch[2].toLowerCase().startsWith('year') ? 'years' : 'months',
      );
    }
    if (maxPages) setWarrantyCopyLimit(String(maxPages));
    setWarrantyType(durationMatch && maxPages ? 'both' : durationMatch ? 'duration' : 'copies');
    setWarrantyManuallySet(true);
  };

  const addItem = (item: SelectableItem, asAccessory: boolean = false) => {
    let description = '',
      basePrice = 0,
      wholesalePrice = 0,
      retailPrice = 0,
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
      retailPrice = Number(sp.base_price) || 0;
      wholesalePrice = Number(sp.wholesale_price) || 0;
      basePrice = transactionType === 'B2B' && wholesalePrice > 0 ? wholesalePrice : retailPrice;
      maxDiscount = Number(sp.max_discount_amount) || 0;
      sparePartId = sp.id;
      itemType = 'SPAREPART';
      availableStock = typeof sp.quantity === 'number' ? sp.quantity : 999999;
    } else {
      const pr = item as Product;
      description = pr.name || pr.description || pr.model?.description || 'Product';

      retailPrice = pr.sale_price || 0;
      wholesalePrice = pr.wholesale_price || 0;
      basePrice = transactionType === 'B2B' && wholesalePrice > 0 ? wholesalePrice : retailPrice;
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
          existing.itemType === 'SPAREPART' &&
          !!existing.isAccessory === asAccessory
        );
      } else {
        return (
          !existing.isManual &&
          existing.productId === productId &&
          existing.itemType === 'PRODUCT' &&
          !!existing.isAccessory === asAccessory
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

    // An accessory's warranty metadata isn't the rented/leased machine's warranty — only
    // let a real machine seed the quotation-level warranty defaults.
    if (!isSparePart && !asAccessory) applyProductWarrantyDefaults(item as Product);

    setSaleItems((prev) => [
      ...prev,
      {
        description,
        quantity: 1,
        basePrice,
        discount: 0,
        unitPrice: basePrice,
        maxDiscount,
        wholesalePrice,
        retailPrice,
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
        isAccessory: asAccessory,
        imageUrl: !isSparePart ? (item as Product).imageUrl : undefined,
      },
    ]);
    toast.success(asAccessory ? `Added accessory: ${description}` : `Added ${description}`);
  };

  const removeItem = (i: number) => setSaleItems((prev) => prev.filter((_, idx) => idx !== i));

  // When the user switches B2B ↔ B2C after items are already in the list, reprice
  // every catalog item to its matching tier. Manual custom items have no stored
  // catalog prices so they are left exactly as entered.
  useEffect(() => {
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.isManual) return item;
        const newBase =
          transactionType === 'B2B' && (item.wholesalePrice ?? 0) > 0
            ? item.wholesalePrice!
            : (item.retailPrice ?? item.basePrice);
        return { ...item, basePrice: newBase, unitPrice: newBase, discount: 0 };
      }),
    );
  }, [transactionType]);

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
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
            {title}
          </span>
          <button
            onClick={() => updateItem(itemIndex, toggleField, !isToggleOn)}
            className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight transition-all shadow-sm ${
              isToggleOn
                ? 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90'
                : 'bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-primary'
            }`}
          >
            {isToggleOn ? '✓ Fixed Rate (0-100K) ON' : '+ Enable Fixed Rate (0-100K)'}
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-black text-primary px-3 bg-card border-primary/30 hover:bg-primary/10 hover:border-primary/30 shadow-sm gap-2"
          onClick={() => addSlab(itemIndex, type)}
        >
          <Plus size={12} className="stroke-[3]" /> Add Slab
        </Button>
      </div>

      {isToggleOn && (
        <div className="flex gap-4 items-center bg-primary/10 p-3 rounded-xl border border-primary/30 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex-1">
            <p className="text-[10px] font-black text-primary uppercase tracking-wider">
              Fixed Rate Up To 100K
            </p>
            <p className="text-[9px] text-primary font-bold italic mt-0.5">
              (Applies to usage from 0 to 100,000 units)
            </p>
          </div>
          <div className="relative w-32">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary pointer-events-none">
              {currency}
            </span>
            <Input
              placeholder="0.00"
              type="text"
              inputMode="decimal"
              value={rateValue ?? ''}
              onChange={(e) => {
                const v = handleDecimalInput(e.target.value);
                if (v !== undefined) updateItem(itemIndex, rateField, v);
              }}
              className="h-9 text-xs font-black text-primary bg-card border-primary/30 focus:ring-2 focus:ring-primary/20 pr-10 text-right"
            />
          </div>
          <div className="w-8 shrink-0" /> {/* Spacer for alignment */}
        </div>
      )}

      {slabs && slabs.length > 0 && (
        <div className="space-y-2 mt-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-3 mb-1">
            <div className="col-span-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              From
            </div>
            <div className="col-span-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              To
            </div>
            <div className="col-span-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right pr-2">
              Rate per Page ({currency})
            </div>
            <div className="col-span-1" />
          </div>

          {slabs.map((slab, sIdx) => (
            <div
              key={`${type}-${sIdx}`}
              className="group flex gap-2 items-center bg-card p-1 rounded-xl border border-transparent hover:border-border hover:shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="grid grid-cols-12 gap-3 flex-1 items-center">
                <div className="col-span-3">
                  <Input
                    placeholder="0"
                    type="number"
                    value={slab.from}
                    onChange={(e) => updateSlab(itemIndex, type, sIdx, 'from', e.target.value)}
                    className="h-9 text-xs font-bold bg-muted/50 border-border focus:bg-card text-center"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="∞"
                    type={slab.to === '1000000' ? 'text' : 'number'}
                    value={slab.to === '1000000' ? 'UNLIMITED' : slab.to}
                    onChange={(e) => updateSlab(itemIndex, type, sIdx, 'to', e.target.value)}
                    className={`h-9 text-xs font-bold text-center border-border ${
                      slab.to === '1000000'
                        ? 'text-primary bg-primary/10 border-primary/30'
                        : 'bg-muted/50 focus:bg-card'
                    }`}
                  />
                </div>
                <div className="col-span-5 relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground pointer-events-none group-hover:text-primary">
                    {currency}
                  </span>
                  <Input
                    placeholder="0.00"
                    type="text"
                    inputMode="decimal"
                    value={slab.rate}
                    onChange={(e) => {
                      const v = handleDecimalInput(e.target.value);
                      if (v !== undefined) updateSlab(itemIndex, type, sIdx, 'rate', v);
                    }}
                    className="h-9 text-xs font-black text-primary bg-primary/10 border-primary/30 focus:bg-card text-right pr-10"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeSlab(itemIndex, type, sIdx)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
          toast.warning(`Maximum discount allowed is ${currency} ${maxLimit}`);
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
        ['bwIncludedLimit', 'colorIncludedLimit', 'combinedIncludedLimit'].includes(field as string)
      ) {
        items[index] = { ...item, [field]: Number(value) };
      } else if (field === 'separateA3Pricing') {
        const on = !!value;
        // Seed each A3 rate from its A4 rate the first time the toggle goes on, so the
        // quote starts at the same money the a3Multiplier would have produced. Rates the
        // user has already typed are left alone.
        items[index] = {
          ...item,
          separateA3Pricing: on,
          bwA3ExcessRate:
            on && !item.bwA3RateTouched ? deriveA3Rate(item.bwExcessRate) : item.bwA3ExcessRate,
          colorA3ExcessRate:
            on && !item.colorA3RateTouched
              ? deriveA3Rate(item.colorExcessRate)
              : item.colorA3ExcessRate,
        };
      } else if (field === 'bwA3ExcessRate' || field === 'colorA3ExcessRate') {
        // Typing in an A3 rate pins it — later A4 edits stop overwriting it.
        items[index] = {
          ...item,
          [field]: value,
          ...(field === 'bwA3ExcessRate'
            ? { bwA3RateTouched: true }
            : { colorA3RateTouched: true }),
        };
      } else if (field === 'bwExcessRate' || field === 'colorExcessRate') {
        const isBw = field === 'bwExcessRate';
        const pinned = isBw ? item.bwA3RateTouched : item.colorA3RateTouched;
        items[index] = {
          ...item,
          [field]: value,
          ...(item.separateA3Pricing && !pinned
            ? isBw
              ? { bwA3ExcessRate: deriveA3Rate(String(value)) }
              : { colorA3ExcessRate: deriveA3Rate(String(value)) }
            : {}),
        };
      } else if (
        ['combinedExcessRate', 'bwRateUpTo100k', 'colorRateUpTo100k', 'comboRateUpTo100k'].includes(
          field as string,
        )
      ) {
        items[index] = { ...item, [field]: value };
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
        validityDays: validDays,
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: validityDate.toISOString().split('T')[0],
        // Warranty — only for PRODUCT_SALE
        ...(quotationType === 'PRODUCT_SALE' && {
          warrantyType,
          warrantyDurationValue:
            (warrantyType === 'duration' || warrantyType === 'both') && warrantyDurationValue
              ? Number(warrantyDurationValue)
              : undefined,
          warrantyDurationUnit:
            warrantyType === 'duration' || warrantyType === 'both'
              ? warrantyDurationUnit
              : undefined,
          warrantyCopyLimit:
            (warrantyType === 'copies' || warrantyType === 'both') && warrantyCopyLimit
              ? Number(warrantyCopyLimit)
              : undefined,
        }),
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
        // CPC / CPC_COMBO billing is per-copy — the backend rejects monthlyRent > 0 for
        // these, so never send it regardless of what the (now-cleared) state holds.
        monthlyRent:
          rentType !== 'CPC' && rentType !== 'CPC_COMBO' && monthlyRent
            ? Number(monthlyRent)
            : undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
        paymentTiming,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        validityDays: validDays,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,

        // Security Deposit
        securityDepositAmount: securityDepositAmount ? Number(securityDepositAmount) : undefined,
        securityDepositMode,
        securityDepositReference,
        securityDepositBank,

        items: saleItems.map((it, idx) => {
          // Accessories are real priced line items, not rate-config for a machine — send
          // their actual price/productId through untouched, skip the STD/PRM/rate mapping
          // below entirely (none of it applies to an accessory).
          if (it.isAccessory) {
            return {
              description: it.description,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice) || 0,
              itemType: 'ACCESSORY' as const,
              productId: it.productId,
              modelId: it.modelId,
            };
          }

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

          // STD/PRM layout style tags the first MACHINE, not the first array entry — an
          // accessory added before the machine must not steal this prefix.
          const firstMachineIdx = saleItems.findIndex((x) => !x.isAccessory);
          if (idx === firstMachineIdx) {
            if (selectedLayoutStyle === 'standard') desc = `[STD] ${desc}`;
            else if (selectedLayoutStyle === 'premium') desc = `[PRM] ${desc}`;
          }

          return {
            ...it,
            description: desc,
            unitPrice: 0,
            productId: undefined,
            warranty: it.warranty,
            bwExcessRate: Number(it.bwExcessRate) || 0,
            colorExcessRate: Number(it.colorExcessRate) || 0,
            combinedExcessRate: Number(it.combinedExcessRate) || 0,
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
        paymentTiming,

        // Security Deposit
        securityDepositAmount: securityDepositAmount ? Number(securityDepositAmount) : undefined,
        securityDepositMode,
        securityDepositReference,
        securityDepositBank,

        // Warranty
        warrantyType,
        warrantyDurationValue:
          (warrantyType === 'duration' || warrantyType === 'both') && warrantyDurationValue
            ? Number(warrantyDurationValue)
            : undefined,
        warrantyDurationUnit:
          warrantyType === 'duration' || warrantyType === 'both' ? warrantyDurationUnit : undefined,
        warrantyCopyLimit:
          (warrantyType === 'copies' || warrantyType === 'both') && warrantyCopyLimit
            ? Number(warrantyCopyLimit)
            : undefined,

        // Warranty
        // For FSM Leases, we need rentType and monthly rent mapped dynamically
        rentType: leaseType === 'FSM' ? (rentType as CreateInvoicePayload['rentType']) : undefined,
        // CPC / CPC_COMBO billing is per-copy — the backend rejects monthlyRent > 0 for
        // these, so never send it regardless of what the (now-cleared) state holds.
        monthlyRent:
          leaseType === 'FSM' && rentType !== 'CPC' && rentType !== 'CPC_COMBO' && monthlyRent
            ? Number(monthlyRent)
            : undefined,
        monthlyLeaseAmount:
          leaseType === 'FSM' && totalLeaseAmount ? Number(totalLeaseAmount) : undefined,
        validityDays: validDays,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        items: saleItems.map((it, idx) => {
          // Accessories are real priced line items, not rate-config for a machine — send
          // their actual price/productId through untouched, skip the STD/PRM/FSM rate
          // mapping below entirely (none of it applies to an accessory).
          if (it.isAccessory) {
            return {
              description: it.description,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice) || 0,
              itemType: 'ACCESSORY' as const,
              productId: it.productId,
              modelId: it.modelId,
            };
          }

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

          // STD/PRM layout style tags the first MACHINE, not the first array entry — an
          // accessory added before the machine must not steal this prefix.
          const firstMachineIdx = saleItems.findIndex((x) => !x.isAccessory);
          if (idx === firstMachineIdx) {
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
                    rentType === 'FIXED_LIMIT' || rentType === 'CPC'
                      ? Number(it.bwExcessRate) || 0
                      : 0,
                  colorExcessRate:
                    rentType === 'FIXED_LIMIT' || rentType === 'CPC'
                      ? Number(it.colorExcessRate) || 0
                      : 0,
                  combinedExcessRate:
                    rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO'
                      ? Number(it.combinedExcessRate) || 0
                      : 0,
                  // Separate A3/A4 pricing is a CPC-only plan shape (see the toggle in the
                  // Lease FSM form) — send the flag off for every other billing type so a
                  // plan switched away from CPC can't keep billing on stale A3 rates.
                  separateA3Pricing: rentType === 'CPC' ? !!it.separateA3Pricing : false,
                  bwA3ExcessRate:
                    rentType === 'CPC' && it.separateA3Pricing
                      ? Number(it.bwA3ExcessRate) || 0
                      : undefined,
                  colorA3ExcessRate:
                    rentType === 'CPC' && it.separateA3Pricing
                      ? Number(it.colorA3ExcessRate) || 0
                      : undefined,
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
            ? saleItems
                .filter((it) => !it.isAccessory)
                .map((it) => ({
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
                    rentType === 'FIXED_LIMIT' || rentType === 'CPC'
                      ? Number(it.bwExcessRate) || 0
                      : 0,
                  colorExcessRate:
                    rentType === 'FIXED_LIMIT' || rentType === 'CPC'
                      ? Number(it.colorExcessRate) || 0
                      : 0,
                  combinedExcessRate:
                    rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO'
                      ? Number(it.combinedExcessRate) || 0
                      : 0,
                  // Separate A3/A4 pricing is a CPC-only plan shape (see the toggle in the
                  // Lease FSM form) — send the flag off for every other billing type so a
                  // plan switched away from CPC can't keep billing on stale A3 rates.
                  separateA3Pricing: rentType === 'CPC' ? !!it.separateA3Pricing : false,
                  bwA3ExcessRate:
                    rentType === 'CPC' && it.separateA3Pricing
                      ? Number(it.bwA3ExcessRate) || 0
                      : undefined,
                  colorA3ExcessRate:
                    rentType === 'CPC' && it.separateA3Pricing
                      ? Number(it.colorA3ExcessRate) || 0
                      : undefined,
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
      color: 'bg-primary',
      desc: 'Direct sale of full machines & products',
    },
    SPAREPART_SALE: {
      icon: Wrench,
      label: 'Spare Parts Sale',
      color: 'bg-info',
      desc: 'Quotation for spare parts and accessories',
    },
    RENT: {
      icon: Key,
      label: 'Rent Quotation',
      color: 'bg-warning',
      desc: 'Machine rental with pricing & billing cycle',
    },
    LEASE: {
      icon: FileSignature,
      label: 'Lease Quotation',
      color: 'bg-lease',
      desc: 'Long-term lease with EMI or FSM plan',
    },
  };
  const tc = typeConfig[quotationType];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-background h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`h-12 w-12 rounded-xl ${tc.color} text-primary-foreground flex items-center justify-center shadow-lg`}
            >
              <tc.icon size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
                New Quotation
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {tc.desc}
              </DialogDescription>
            </div>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-3 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {s}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:block ${step >= s ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {s === 1 ? 'Type & Customer' : 'Quotation Details'}
                </span>
                {s < 2 && <div className={`h-px w-8 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
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
                        color="border-primary/30 hover:border-primary/30"
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
                        color="border-warning/30 hover:border-warning/30"
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
                        color="border-lease/30 hover:border-lease/30"
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
                          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary h-7"
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
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg ${quotationType === 'PRODUCT_SALE' ? 'bg-card' : 'bg-muted'}`}
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
                                ? 'border-info bg-info/10 text-info'
                                : 'border-border hover:border-info/30'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg ${quotationType === 'SPAREPART_SALE' ? 'bg-card' : 'bg-muted'}`}
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
                        className="text-[10px] font-bold uppercase text-muted-foreground"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/20" /> Customer
                </label>
                <CustomerSelect
                  value={customerId}
                  onChange={(id, entity) => {
                    setCustomerId(id);
                    // Pre-fill transaction type from the customer's stored default;
                    // only applies for SALE quotations — the field is visible there.
                    const ct = (entity as Record<string, unknown>).customerType;
                    if (ct === 'B2B' || ct === 'B2C') setTransactionType(ct);
                    else setTransactionType('B2C');
                  }}
                  customersOnly
                />
              </div>

              {/* Transaction Type — B2B uses wholesale_price, B2C uses sale_price/base_price.
                  No manual dropdown: the customer record already carries this classification
                  (set on CustomerSelect above), so it's derived automatically and just shown
                  here read-only for transparency rather than asked for again. */}
              {['PRODUCT_SALE', 'SPAREPART_SALE'].includes(quotationType) && (
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lease/20" /> Transaction Type
                  </label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
                    {transactionType === 'B2B'
                      ? 'B2B — Business to Business (Wholesale Price)'
                      : 'B2C — Business to Customer (Retail Price)'}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Set automatically from the customer&apos;s account type.
                  </p>
                </div>
              )}

              {/* Validity & Notes (all quotation types) */}
              {['PRODUCT_SALE', 'SPAREPART_SALE', 'RENT', 'LEASE'].includes(quotationType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/20" />{' '}
                      {quotationType === 'PRODUCT_SALE'
                        ? 'Products'
                        : quotationType === 'SPAREPART_SALE'
                          ? 'Spare Parts'
                          : 'Items'}
                    </h4>
                  </div>
                  {/* Barcode Scanner Input */}
                  <div className="bg-muted p-4 rounded-xl border border-border shadow-inner space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 pl-0.5">
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
                        className="bg-card rounded-lg border-border"
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
                      className="h-[52px] px-4 rounded-xl border-dashed border-2 border-border text-muted-foreground hover:border-primary hover:text-primary transition-all font-bold flex items-center gap-2 shrink-0"
                    >
                      <Plus size={16} /> Custom Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {saleItems.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                        <p className="text-sm font-bold text-muted-foreground">
                          No items added yet.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Search above to add products.
                        </p>
                      </div>
                    ) : (
                      saleItems.map((item, index) => (
                        <div
                          key={index}
                          className="relative bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all"
                        >
                          <button
                            onClick={() => removeItem(index)}
                            className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {item.isManual ? (
                              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Specifications / Description
                                  </label>
                                  <Textarea
                                    placeholder="Detailed specifications..."
                                    value={item.description}
                                    onChange={(e) =>
                                      updateItem(index, 'description', e.target.value)
                                    }
                                    className="min-h-[60px] text-sm resize-none bg-muted/50"
                                  />
                                </div>
                                {quotationType === 'SPAREPART_SALE' && (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Quantity
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(index, 'quantity', Number(e.target.value))
                                      }
                                      className="h-9 text-sm bg-muted/50 text-center font-bold"
                                    />
                                  </div>
                                )}
                                <div className="md:col-span-2 space-y-1">
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase text-right block">
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase text-center block">
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
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Net
                                  </p>
                                  <p className="font-extrabold text-foreground">
                                    {formatCurrency(item.quantity * item.unitPrice, currency)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={`space-y-1 ${item.itemType === 'SPAREPART' ? 'md:col-span-4' : 'md:col-span-6'}`}
                                >
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase">
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

                                {item.itemType === 'SPAREPART' && (
                                  <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Quantity
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(index, 'quantity', Number(e.target.value))
                                      }
                                      className="h-9 text-sm bg-muted/50 text-center font-bold"
                                    />
                                  </div>
                                )}

                                <div className="md:col-span-2 space-y-1">
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase text-right block">
                                    Rate ({currency})
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
                                  <label className="text-[9px] font-bold text-muted-foreground uppercase text-center block">
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
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">
                                    Net
                                  </p>
                                  <p className="font-extrabold text-foreground">
                                    {formatCurrency(item.quantity * item.unitPrice, currency)}
                                  </p>
                                </div>
                              </>
                            )}
                            {/* Replacement Consumables Section */}
                            {quotationType === 'PRODUCT_SALE' && (
                              <div className="md:col-span-12 mt-2 pt-2 border-t border-border">
                                <div className="bg-muted/50 rounded-xl p-5 border border-border/60 transition-all hover:bg-muted">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-primary/10 p-1.5 rounded-lg">
                                        <ShoppingCart size={14} className="text-primary" />
                                      </div>
                                      <div>
                                        <h5 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                                          Replacement Consumables
                                        </h5>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5">
                                          (Optional add-ons for this product)
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addConsumable(index)}
                                      className="h-8 text-[11px] font-black uppercase text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/30 gap-2 shadow-sm"
                                    >
                                      <span className="text-lg">+</span> Add Part
                                    </Button>
                                  </div>

                                  {item.consumables && item.consumables.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-3 mb-1">
                                        <div className="md:col-span-3 text-[9px] font-black text-muted-foreground uppercase">
                                          Part Name
                                        </div>
                                        <div className="md:col-span-4 text-[9px] font-black text-muted-foreground uppercase">
                                          Specifications
                                        </div>
                                        <div className="md:col-span-3 text-[9px] font-black text-muted-foreground uppercase text-center">
                                          Yield
                                        </div>
                                        <div className="md:col-span-2 text-[9px] font-black text-muted-foreground uppercase text-right">
                                          Price ({currency})
                                        </div>
                                      </div>

                                      {item.consumables.map((cons, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-card p-3 rounded-lg border border-border shadow-sm relative group animate-in fade-in slide-in-from-top-1 duration-200"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => removeConsumable(index, cIdx)}
                                            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-card border border-destructive/30 text-destructive flex items-center justify-center hover:bg-destructive/90 hover:text-destructive-foreground shadow-md opacity-0 group-hover:opacity-100 transition-all z-20"
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
                                              className="h-9 text-xs font-bold bg-muted/30 border-border focus:bg-card"
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
                                              className="h-9 text-xs font-bold bg-muted/30 border-border focus:bg-card"
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
                                              className="h-9 text-xs font-bold text-center bg-muted/30 border-border focus:bg-card"
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
                                              className="h-9 text-xs font-black text-right text-primary bg-primary/10 border-primary/30 focus:bg-card"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl bg-muted/30">
                                      <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-tight">
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
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Grand Total
                      </p>
                      <p className="text-2xl font-black text-primary">
                        {formatCurrency(saleTotal, currency)}
                      </p>
                    </div>
                  )}

                  {/* Warranty Configuration — PRODUCT_SALE only */}
                  {quotationType === 'PRODUCT_SALE' && (
                    <div className="bg-card p-5 rounded-xl border border-warning/30 bg-warning/10 shadow-sm space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-warning uppercase flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning/20" /> Warranty
                          Configuration
                        </label>
                        <Badge className="bg-warning/10 text-warning hover:bg-warning/10 border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                          SALE SPECIFIC
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Warranty Type
                          </label>
                          <Select
                            value={warrantyType}
                            onValueChange={(v) => {
                              setWarrantyType(v as 'none' | 'duration' | 'copies' | 'both');
                              setWarrantyManuallySet(true);
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm border-warning/30 bg-card shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Warranty</SelectItem>
                              <SelectItem value="duration">By Duration (Time-based)</SelectItem>
                              <SelectItem value="copies">By Count of Copies</SelectItem>
                              <SelectItem value="both">
                                Both (Duration &amp; Copies, whichever first)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(warrantyType === 'duration' || warrantyType === 'both') && (
                          <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                Duration Value
                              </label>
                              <Input
                                type="number"
                                placeholder="e.g. 6"
                                value={warrantyDurationValue}
                                onChange={(e) => {
                                  setWarrantyDurationValue(e.target.value);
                                  setWarrantyManuallySet(true);
                                }}
                                className="h-9 text-sm border-warning/30 shadow-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                Unit
                              </label>
                              <Select
                                value={warrantyDurationUnit}
                                onValueChange={(v) => {
                                  setWarrantyDurationUnit(v as 'months' | 'years');
                                  setWarrantyManuallySet(true);
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm border-warning/30 bg-card">
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

                        {(warrantyType === 'copies' || warrantyType === 'both') && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Warranty Copy Limit (Total)
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 100000"
                              value={warrantyCopyLimit}
                              onChange={(e) => {
                                setWarrantyCopyLimit(e.target.value);
                                setWarrantyManuallySet(true);
                              }}
                              className="h-9 text-sm border-warning/30 shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ── RENT FIELDS ───────────────────────────────────────────── */}
              {quotationType === 'RENT' && (
                <div className="space-y-5 mb-6">
                  {/* Rent Type Selector Moved to Top */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-primary/30 shadow-sm space-y-2 bg-primary/10">
                      <label className="text-[11px] font-bold text-primary uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/20" /> Rent Type / Model
                      </label>
                      <Select value={rentType} onValueChange={handleRentTypeChange}>
                        <SelectTrigger className="h-9 text-sm border-primary/30">
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
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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
                  <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning/20" /> Specific Machines
                      (Products)
                    </label>
                    <ProductSelect
                      mode="PRODUCT"
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id && !x.isAccessory))
                          return;
                        addItem(item);
                      }}
                      placeholder="Select Product"
                    />
                    {saleItems.some((x) => !x.isAccessory) && (
                      <div className="space-y-4 mt-2">
                        {saleItems.map((m, index) => {
                          if (m.isAccessory) return null;
                          return (
                            <div
                              key={m.productId || index}
                              className="flex flex-col gap-3 bg-warning/10 border border-warning/30 rounded-lg px-4 py-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm font-black text-foreground">
                                  {m.imageUrl ? (
                                    <img
                                      src={m.imageUrl}
                                      alt={m.description}
                                      className="w-8 h-8 rounded object-cover border border-warning/30 bg-card shrink-0"
                                    />
                                  ) : (
                                    <span className="w-8 h-8 rounded bg-card border border-warning/30 flex items-center justify-center text-warning shrink-0">
                                      <Package size={14} />
                                    </span>
                                  )}
                                  {m.description}
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="text-muted-foreground hover:text-destructive transition-colors bg-card hover:bg-destructive/10 p-1 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Dynamic Pricing Inputs Based on Rent Type */}
                              {rentType !== 'FIXED_FLAT' && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-3 rounded border border-warning/30 shadow-sm">
                                  {rentType === 'FIXED_LIMIT' && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        B/W Excess Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.bwExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined) updateItem(index, 'bwExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                  {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        Color Excess Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.colorExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'colorExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                  {(rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO') && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        Combo Excess Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.combinedExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'combinedExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Slab Rates UI for CPC */}
                              {(rentType === 'CPC' || rentType === 'CPC_COMBO') && (
                                <div className="mt-3 bg-muted p-3 rounded-lg border border-border">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
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
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Accessories */}
                  <div className="bg-card p-5 rounded-xl border border-info/30 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-info uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-info/20" /> Accessories (Optional)
                    </label>
                    <p className="text-[10px] text-muted-foreground -mt-1">
                      Extra items supplied with the machine (stand, tray, stapler unit, etc.) —
                      billed once with the first month advance. No meter reading applies.
                    </p>
                    <ProductSelect
                      mode="PRODUCT"
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id && x.isAccessory)) {
                          toast.error(
                            'This accessory is already added. Adjust its quantity below.',
                          );
                          return;
                        }
                        addItem(item, true);
                      }}
                      placeholder="Select Accessory Product"
                    />
                    {accessoryItems.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {saleItems.map((m, index) => {
                          if (!m.isAccessory) return null;
                          return (
                            <div
                              key={m.productId || index}
                              className="flex items-center gap-3 bg-info/10 border border-info/30 rounded-lg px-3 py-3"
                            >
                              {m.imageUrl ? (
                                <img
                                  src={m.imageUrl}
                                  alt={m.description}
                                  className="w-12 h-12 rounded-md object-cover border border-info/30 bg-card shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-card border border-info/30 flex items-center justify-center text-info shrink-0">
                                  <Package size={18} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-foreground truncate">
                                  {m.description}
                                </p>
                                <p className="text-[9px] font-bold text-info uppercase tracking-wider">
                                  Accessory
                                </p>
                              </div>
                              <div className="w-14 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Qty
                                </label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={m.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                  className="h-8 text-[11px] font-bold"
                                />
                              </div>
                              <div className="w-20 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Rate ({currency})
                                </label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={m.basePrice}
                                  readOnly={!m.isEditable}
                                  onChange={(e) => {
                                    const v = handleDecimalInput(e.target.value);
                                    if (v !== undefined) updateItem(index, 'basePrice', v);
                                  }}
                                  className={`h-8 text-[11px] font-bold ${!m.isEditable ? 'bg-muted/50 text-muted-foreground' : ''}`}
                                />
                              </div>
                              <div className="w-16 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Discount
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={m.discount === 0 ? '' : m.discount}
                                  placeholder="0"
                                  onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                  className="h-8 text-[11px] font-bold"
                                />
                              </div>
                              <div className="w-20 space-y-1 text-right">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Net
                                </label>
                                <p className="h-8 flex items-center justify-end text-[11px] font-black text-info">
                                  {formatCurrency(m.quantity * m.unitPrice, currency)}
                                </p>
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors bg-card hover:bg-destructive/10 p-1 rounded shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                        <div className="flex justify-end">
                          <p className="text-xs font-black text-info">
                            Accessories Total: {formatCurrency(accessoryTotal, currency)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Timing */}
                  <div className="bg-card p-5 rounded-xl border border-lease/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-lease uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lease/20" /> Payment Timing
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Billing Method
                        </label>
                        <Select
                          value={paymentTiming}
                          onValueChange={(v) => setPaymentTiming(v as 'ADVANCE' | 'ARREARS')}
                        >
                          <SelectTrigger className="h-9 text-sm w-full border-warning/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Disabled on CPC: there is no fixed rent to prepay, so
                                the auto-switch to postpaid cannot be undone into an
                                invalid combination. */}
                            <SelectItem
                              value="ADVANCE"
                              disabled={rentType === 'CPC' || rentType === 'CPC_COMBO'}
                            >
                              Advance Billing (Advance Payment)
                            </SelectItem>
                            <SelectItem value="ARREARS">
                              Arrears Billing (Postpaid Billing)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Description
                        </label>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {rentType === 'CPC' || rentType === 'CPC_COMBO'
                            ? 'Cost-per-copy is billed after the fact — the charge depends on copies actually made, so postpaid is the only option.'
                            : paymentTiming === 'ADVANCE'
                              ? 'Customer pays upcoming period rent in advance + current excess usage each billing cycle.'
                              : 'Customer pays current period rent + excess usage after the billing period completes.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rent Config - Remaining Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rentType !== 'CPC' && rentType !== 'CPC_COMBO' && (
                      <>
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                            <span>Periodic Rent ({rentPeriod.replace('_', ' ')})</span>
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={monthlyRent}
                            onChange={(e) => {
                              const v = handleDecimalInput(e.target.value);
                              if (v !== undefined) {
                                setMonthlyRent(v);
                                if (!advanceEdited) setAdvanceAmount(v);
                              }
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                        {paymentTiming === 'ADVANCE' && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                              First Month Advance Payment ({currency})
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={advanceAmount}
                              onChange={(e) => {
                                const v = handleDecimalInput(e.target.value);
                                if (v !== undefined) {
                                  setAdvanceEdited(true);
                                  setAdvanceAmount(v);
                                }
                              }}
                              className="h-9 text-sm"
                            />
                          </div>
                        )}
                        {paymentTiming === 'ARREARS' && (
                          <div className="bg-card p-4 rounded-xl border border-lease/30 shadow-sm space-y-2">
                            <label className="text-[11px] font-bold text-lease uppercase">
                              Postpaid — No Advance Required
                            </label>
                            <p className="text-[10px] text-muted-foreground">
                              First payment collected after the first billing period completes.
                            </p>
                          </div>
                        )}
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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

                  {/* Security Deposit Section */}
                  <div className="bg-card p-5 rounded-xl border border-warning/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-warning uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning/20" /> Security Deposit
                      (Optional)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Security Deposit Amount ({currency})
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={securityDepositAmount}
                          onChange={(e) => {
                            const v = handleDecimalInput(e.target.value);
                            if (v !== undefined) setSecurityDepositAmount(v);
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                      {securityDepositAmount && Number(securityDepositAmount) > 0 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Deposit Payment Mode
                            </label>
                            <select
                              value={securityDepositMode}
                              onChange={(e) =>
                                setSecurityDepositMode(e.target.value as 'CASH' | 'CHEQUE')
                              }
                              className="h-9 text-sm w-full rounded-md border border-border bg-card px-2"
                            >
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CHEQUE">Cheque</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Reference / Cheque No
                            </label>
                            <Input
                              type="text"
                              placeholder="Optional"
                              value={securityDepositReference}
                              onChange={(e) => setSecurityDepositReference(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          {securityDepositMode === 'CHEQUE' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                Name of the Bank
                              </label>
                              <Input
                                placeholder="e.g. QNB"
                                value={securityDepositBank}
                                onChange={(e) => setSecurityDepositBank(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Agreement Details (Shared for Rent/Lease) */}
                  <div className="bg-card p-5 rounded-xl border border-primary/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-primary uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/20" /> Agreement Terms
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
                          className="h-9 text-sm border-border"
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
                          className="h-9 text-sm text-center border-border"
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
                          className="h-9 text-sm bg-muted text-right opacity-70 border-border"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEASE FIELDS ──────────────────────────────────────────── */}
              {quotationType === 'LEASE' && (
                <div className="space-y-5 mb-6">
                  {/* Lease Type Selector Moved to Top */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-lease/30 shadow-sm space-y-2 bg-lease/10 min-w-0 w-full">
                      <label className="text-[11px] font-bold text-lease uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-lease/20" /> Lease Type
                      </label>
                      <Select
                        value={leaseType}
                        onValueChange={(v) => {
                          const newLeaseType = v as 'EMI' | 'FSM';
                          setLeaseType(newLeaseType);
                          // FSM leases only offer CPC billing now — force off any
                          // legacy FIXED_* default so the dropdown below stays valid.
                          if (
                            newLeaseType === 'FSM' &&
                            rentType !== 'CPC' &&
                            rentType !== 'CPC_COMBO'
                          ) {
                            handleRentTypeChange('CPC');
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm border-lease/30 w-full">
                          <SelectValue placeholder="Select Lease Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMI">EMI (Equated Monthly Instalment)</SelectItem>
                          <SelectItem value="FSM">FSM (Full Service Maintenance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2 min-w-0 w-full">
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
                      <div className="bg-card p-4 rounded-xl border border-primary/30 shadow-sm space-y-2 bg-primary/10 min-w-0 w-full">
                        <label className="text-[11px] font-bold text-primary uppercase flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary/20" /> Service Billing
                          Type (FSM)
                        </label>
                        <Select value={rentType} onValueChange={handleRentTypeChange}>
                          <SelectTrigger className="h-9 text-sm border-primary/30 w-full">
                            <SelectValue placeholder="Select Billing Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CPC">CPC (Cost Per Copy)</SelectItem>
                            <SelectItem value="CPC_COMBO">CPC Combo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Machines */}
                  <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lease/20" /> Specific Machines
                      (Products)
                    </label>
                    <ProductSelect
                      mode="PRODUCT"
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id && !x.isAccessory))
                          return;
                        addItem(item);
                      }}
                      placeholder="Select Product"
                    />
                    {saleItems.some((x) => !x.isAccessory) && (
                      <div className="space-y-2 mt-2">
                        {saleItems.map((m, index) => {
                          if (m.isAccessory) return null;
                          return (
                            <div
                              key={m.productId || index}
                              className="flex flex-col gap-3 bg-lease/10 border border-lease/30 rounded-lg px-4 py-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm font-black text-foreground">
                                  {m.imageUrl ? (
                                    <img
                                      src={m.imageUrl}
                                      alt={m.description}
                                      className="w-8 h-8 rounded object-cover border border-lease/30 bg-card shrink-0"
                                    />
                                  ) : (
                                    <span className="w-8 h-8 rounded bg-card border border-lease/30 flex items-center justify-center text-lease shrink-0">
                                      <Package size={14} />
                                    </span>
                                  )}
                                  {m.description}
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="text-muted-foreground hover:text-destructive transition-colors bg-card hover:bg-destructive/10 p-1 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              {/* Separate A3/A4 excess pricing — CPC only. Fixed plans price
                                against an included allowance counted in A4-equivalents, so
                                splitting the rate there has no unambiguous meaning. */}
                              {leaseType === 'FSM' && rentType === 'CPC' && (
                                <div className="flex items-center justify-between bg-card px-3 py-2 rounded border border-lease/30 shadow-sm">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                      A3 / A4 Pricing
                                    </p>
                                    <p className="text-[9px] text-muted-foreground font-bold italic mt-0.5">
                                      {m.separateA3Pricing
                                        ? 'A3 pages bill 1:1 at their own rate (no 2x conversion)'
                                        : `A3 pages bill as ${A3_RATE_FACTOR} A4 clicks at the A4 rate`}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(index, 'separateA3Pricing', !m.separateA3Pricing)
                                    }
                                    className={`shrink-0 text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight transition-all shadow-sm ${
                                      m.separateA3Pricing
                                        ? 'bg-lease text-lease-foreground border border-lease hover:bg-lease/90'
                                        : 'bg-card text-muted-foreground border border-border hover:border-lease/30 hover:text-lease'
                                    }`}
                                  >
                                    {m.separateA3Pricing
                                      ? '\u2713 Separate A3 Rates ON'
                                      : '+ Separate A3 Rates'}
                                  </button>
                                </div>
                              )}
                              {/* Dynamic Pricing Inputs for Lease FSM */}
                              {leaseType === 'FSM' && rentType !== 'FIXED_FLAT' && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-3 rounded border border-lease/30 shadow-sm">
                                  {rentType === 'FIXED_LIMIT' && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
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
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        {m.separateA3Pricing && rentType === 'CPC'
                                          ? 'B/W A4 Rate'
                                          : 'B/W Excess Rate'}
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.bwExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined) updateItem(index, 'bwExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                  {rentType === 'CPC' && m.separateA3Pricing && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-lease uppercase tracking-wider block">
                                        B/W A3 Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.bwA3ExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'bwA3ExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold border-lease/30 focus-visible:ring-lease/30"
                                      />
                                    </div>
                                  )}
                                  {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        {m.separateA3Pricing && rentType === 'CPC'
                                          ? 'Color A4 Rate'
                                          : 'Color Excess Rate'}
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.colorExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'colorExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                  {rentType === 'CPC' && m.separateA3Pricing && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-lease uppercase tracking-wider block">
                                        Color A3 Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.colorA3ExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'colorA3ExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold border-lease/30 focus-visible:ring-lease/30"
                                      />
                                    </div>
                                  )}
                                  {(rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO') && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        Combo Excess Rate
                                      </label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Rate"
                                        value={m.combinedExcessRate ?? ''}
                                        onChange={(e) => {
                                          const v = handleDecimalInput(e.target.value);
                                          if (v !== undefined)
                                            updateItem(index, 'combinedExcessRate', v);
                                        }}
                                        className="h-8 text-[11px] font-bold"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Slab Rates UI for CPC */}
                              {(rentType === 'CPC' || rentType === 'CPC_COMBO') && (
                                <div className="mt-3 bg-muted p-3 rounded-lg border border-border">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
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
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Accessories */}
                  <div className="bg-card p-5 rounded-xl border border-info/30 shadow-sm space-y-3">
                    <label className="text-[11px] font-bold text-info uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-info/20" /> Accessories (Optional)
                    </label>
                    <p className="text-[10px] text-muted-foreground -mt-1">
                      Extra items supplied with the machine (stand, tray, stapler unit, etc.) —
                      billed once with the first month advance. No meter reading applies.
                    </p>
                    <ProductSelect
                      mode="PRODUCT"
                      selectedQuantities={selectedQuantities}
                      onSelect={(item) => {
                        if (saleItems.find((x) => x.productId === item.id && x.isAccessory)) {
                          toast.error(
                            'This accessory is already added. Adjust its quantity below.',
                          );
                          return;
                        }
                        addItem(item, true);
                      }}
                      placeholder="Select Accessory Product"
                    />
                    {accessoryItems.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {saleItems.map((m, index) => {
                          if (!m.isAccessory) return null;
                          return (
                            <div
                              key={m.productId || index}
                              className="flex items-center gap-3 bg-info/10 border border-info/30 rounded-lg px-3 py-3"
                            >
                              {m.imageUrl ? (
                                <img
                                  src={m.imageUrl}
                                  alt={m.description}
                                  className="w-12 h-12 rounded-md object-cover border border-info/30 bg-card shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-card border border-info/30 flex items-center justify-center text-info shrink-0">
                                  <Package size={18} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-foreground truncate">
                                  {m.description}
                                </p>
                                <p className="text-[9px] font-bold text-info uppercase tracking-wider">
                                  Accessory
                                </p>
                              </div>
                              <div className="w-14 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Qty
                                </label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={m.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                  className="h-8 text-[11px] font-bold"
                                />
                              </div>
                              <div className="w-20 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Rate ({currency})
                                </label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={m.basePrice}
                                  readOnly={!m.isEditable}
                                  onChange={(e) => {
                                    const v = handleDecimalInput(e.target.value);
                                    if (v !== undefined) updateItem(index, 'basePrice', v);
                                  }}
                                  className={`h-8 text-[11px] font-bold ${!m.isEditable ? 'bg-muted/50 text-muted-foreground' : ''}`}
                                />
                              </div>
                              <div className="w-16 space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Discount
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={m.discount === 0 ? '' : m.discount}
                                  placeholder="0"
                                  onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                  className="h-8 text-[11px] font-bold"
                                />
                              </div>
                              <div className="w-20 space-y-1 text-right">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Net
                                </label>
                                <p className="h-8 flex items-center justify-end text-[11px] font-black text-info">
                                  {formatCurrency(m.quantity * m.unitPrice, currency)}
                                </p>
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors bg-card hover:bg-destructive/10 p-1 rounded shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                        <div className="flex justify-end">
                          <p className="text-xs font-black text-info">
                            Accessories Total: {formatCurrency(accessoryTotal, currency)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Timing */}
                  <div className="bg-card p-5 rounded-xl border border-lease/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-lease uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lease/20" /> Payment Timing
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Billing Method
                        </label>
                        <Select
                          value={paymentTiming}
                          onValueChange={(v) => setPaymentTiming(v as 'ADVANCE' | 'ARREARS')}
                        >
                          <SelectTrigger className="h-9 text-sm w-full border-warning/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Disabled on CPC: there is no fixed rent to prepay, so
                                the auto-switch to postpaid cannot be undone into an
                                invalid combination. */}
                            <SelectItem
                              value="ADVANCE"
                              disabled={rentType === 'CPC' || rentType === 'CPC_COMBO'}
                            >
                              Advance Billing (Advance Payment)
                            </SelectItem>
                            <SelectItem value="ARREARS">
                              Arrears Billing (Postpaid Billing)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Description
                        </label>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {rentType === 'CPC' || rentType === 'CPC_COMBO'
                            ? 'Cost-per-copy is billed after the fact — the charge depends on copies actually made, so postpaid is the only option.'
                            : paymentTiming === 'ADVANCE'
                              ? 'Customer pays upcoming period rent in advance + current excess usage each billing cycle.'
                              : 'Customer pays current period rent + excess usage after the billing period completes.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lease Config - Remaining Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Total Lease Amount ({currency})
                      </label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={totalLeaseAmount}
                        onChange={(e) => {
                          const v = handleDecimalInput(e.target.value);
                          if (v !== undefined) {
                            setLastEditedLease('TOTAL');
                            setTotalLeaseAmount(v);
                            if (!v) {
                              setMonthlyEmiAmount('');
                              setMonthlyRent('');
                            }
                          }
                        }}
                        className="h-9 text-sm font-bold text-primary"
                      />
                    </div>
                    {leaseType === 'EMI' && (
                      <div className="bg-card p-4 rounded-xl border border-lease/30 shadow-sm space-y-2">
                        <label className="text-[11px] font-bold text-lease uppercase flex items-center justify-between">
                          <span>Monthly EMI ({currency})</span>
                          <span className="text-[9px] lowercase">(auto)</span>
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={monthlyEmiAmount}
                          onChange={(e) => {
                            const v = handleDecimalInput(e.target.value);
                            if (v !== undefined) {
                              setLastEditedLease('PERIODIC');
                              setMonthlyEmiAmount(v);
                              if (!v) setTotalLeaseAmount('');
                            }
                          }}
                          className="h-9 text-sm font-bold text-lease"
                        />
                      </div>
                    )}
                    {rentType !== 'CPC' && rentType !== 'CPC_COMBO' && (
                      <>
                        {leaseType === 'FSM' && (
                          <div className="bg-card p-4 rounded-xl border border-lease/30 shadow-sm space-y-2">
                            <label className="text-[11px] font-bold text-lease uppercase flex items-center justify-between">
                              <span>Periodic Rent ({rentPeriod.replace('_', ' ')})</span>
                              <span className="text-[9px] lowercase">(auto)</span>
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={monthlyRent}
                              onChange={(e) => {
                                const v = handleDecimalInput(e.target.value);
                                if (v !== undefined) {
                                  setLastEditedLease('PERIODIC');
                                  setMonthlyRent(v);
                                  if (!advanceEdited) setAdvanceAmount(v);
                                  if (!v) setTotalLeaseAmount('');
                                }
                              }}
                              className="h-9 text-sm font-bold text-primary"
                            />
                          </div>
                        )}
                        {paymentTiming === 'ADVANCE' && (
                          <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase">
                              First Month Advance Payment ({currency})
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={advanceAmount}
                              onChange={(e) => {
                                const v = handleDecimalInput(e.target.value);
                                if (v !== undefined) {
                                  setAdvanceEdited(true);
                                  setAdvanceAmount(v);
                                }
                              }}
                              className="h-9 text-sm"
                            />
                          </div>
                        )}
                        {paymentTiming === 'ARREARS' && (
                          <div className="bg-card p-4 rounded-xl border border-lease/30 shadow-sm space-y-2">
                            <label className="text-[11px] font-bold text-lease uppercase">
                              Postpaid — No Advance Required
                            </label>
                            <p className="text-[10px] text-muted-foreground">
                              First payment collected after the first billing period completes.
                            </p>
                          </div>
                        )}
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
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

                  {/* Security Deposit Section */}
                  <div className="bg-card p-5 rounded-xl border border-warning/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-warning uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning/20" /> Security Deposit
                      (Optional)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Security Deposit Amount ({currency})
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={securityDepositAmount}
                          onChange={(e) => {
                            const v = handleDecimalInput(e.target.value);
                            if (v !== undefined) setSecurityDepositAmount(v);
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                      {securityDepositAmount && Number(securityDepositAmount) > 0 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Deposit Payment Mode
                            </label>
                            <select
                              value={securityDepositMode}
                              onChange={(e) =>
                                setSecurityDepositMode(e.target.value as 'CASH' | 'CHEQUE')
                              }
                              className="h-9 text-sm w-full rounded-md border border-border bg-card px-2"
                            >
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CHEQUE">Cheque</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Reference / Cheque No
                            </label>
                            <Input
                              type="text"
                              placeholder="Optional"
                              value={securityDepositReference}
                              onChange={(e) => setSecurityDepositReference(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          {securityDepositMode === 'CHEQUE' && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                                Name of the Bank
                              </label>
                              <Input
                                placeholder="e.g. QNB"
                                value={securityDepositBank}
                                onChange={(e) => setSecurityDepositBank(e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Agreement Details (Shared for Rent/Lease) */}
                  <div className="bg-card p-5 rounded-xl border border-primary/30 shadow-sm space-y-4">
                    <label className="text-[11px] font-bold text-primary uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/20" /> Agreement Terms
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
                          className="h-9 text-sm border-border"
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
                          className="h-9 text-sm text-center border-border"
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
                          className="h-9 text-sm bg-muted text-right opacity-70 border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Lease Warranty (Conditional) */}
                  <div className="bg-card p-5 rounded-xl border border-warning/30 bg-warning/10 shadow-sm space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-warning uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning/20" /> Warranty
                        Configuration
                      </label>
                      <Badge className="bg-warning/10 text-warning hover:bg-warning/10 border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                        LEASE SPECIFIC
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Warranty Type
                        </label>
                        <Select
                          value={warrantyType}
                          onValueChange={(v) => {
                            setWarrantyType(v as 'none' | 'duration' | 'copies' | 'both');
                            setWarrantyManuallySet(true);
                          }}
                        >
                          <SelectTrigger className="h-9 text-sm border-warning/30 bg-card shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Warranty</SelectItem>
                            <SelectItem value="duration">By Duration (Time-based)</SelectItem>
                            <SelectItem value="copies">By Count of Copies</SelectItem>
                            <SelectItem value="both">
                              Both (Duration &amp; Copies, whichever first)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(warrantyType === 'duration' || warrantyType === 'both') && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Duration Value
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 6"
                              value={warrantyDurationValue}
                              onChange={(e) => {
                                setWarrantyDurationValue(e.target.value);
                                setWarrantyManuallySet(true);
                              }}
                              className="h-9 text-sm border-warning/30 shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Unit
                            </label>
                            <Select
                              value={warrantyDurationUnit}
                              onValueChange={(v) => {
                                setWarrantyDurationUnit(v as 'months' | 'years');
                                setWarrantyManuallySet(true);
                              }}
                            >
                              <SelectTrigger className="h-9 text-sm border-warning/30 bg-card">
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

                      {(warrantyType === 'copies' || warrantyType === 'both') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Warranty Copy Limit (Total)
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g. 100000"
                            value={warrantyCopyLimit}
                            onChange={(e) => {
                              setWarrantyCopyLimit(e.target.value);
                              setWarrantyManuallySet(true);
                            }}
                            className="h-9 text-sm border-warning/30 shadow-sm"
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
        <div className="p-6 bg-card border-t border-border flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
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
                className="h-10 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] uppercase tracking-widest shadow-md shadow-primary/10"
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
                className="h-10 px-8 bg-foreground hover:bg-foreground text-primary-foreground font-bold text-[11px] uppercase tracking-widest shadow-md"
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
