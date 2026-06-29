'use client';

import React, { useState, useCallback } from 'react';
import { StandardTable } from '@/components/table/StandardTable';
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import VendorStats from './VendorStats';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Plus,
  Trash,
  Star,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import {
  createVendor,
  updateVendor,
  deleteVendor as apiDeleteVendor,
  getVendors,
  getVendorStats,
  requestProducts,
} from '@/lib/vendor';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { formatCurrency } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import RequestProductDialog from '@/components/ManagerDashboardComponents/VendorComponents/RequestProductDialog';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const countryList = require('country-list');

type BankAccount = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  ifscCode?: string;
  isPrimary?: boolean;
};

type Vendor = {
  id: string;
  name: string;
  type: 'Supplier' | 'Distributor' | 'Service';
  contactPerson: string;
  phone: string;
  email: string;
  totalOrders: number;
  purchaseValue: number;
  outstandingAmount: number;
  status: 'Active' | 'On Hold';
  currency: string;
  countryCode?: string;
  countryName?: string;
  bankAccounts?: BankAccount[];
};

type VendorFormData = {
  name: string;
  type: 'Supplier' | 'Distributor' | 'Service';
  contactPerson: string;
  phone: string;
  email: string;
  status: 'Active' | 'On Hold';
  currency: string;
  countryCode?: string;
  countryName?: string;
  bankAccounts: BankAccount[];
};

const COUNTRY_TO_CURRENCY_MAP: Record<string, string> = {
  QA: 'QAR',
  AE: 'AED',
  SA: 'SAR',
  OM: 'OMR',
  KW: 'KWD',
  BH: 'BHD',
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  SG: 'SGD',
  EU: 'EUR',
  JP: 'JPY',
  CN: 'CNY',
  AU: 'AUD',
  CA: 'CAD',
  CH: 'CHF',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  MY: 'MYR',
  PH: 'PHP',
  TH: 'THB',
  ID: 'IDR',
  NG: 'NGN',
  ZA: 'ZAR',
  EG: 'EGP',
  KE: 'KES',
  GH: 'GHS',
  TZ: 'TZS',
  UG: 'UGX',
};

const ALL_COUNTRIES: { code: string; name: string }[] = countryList.getData();

const COUNTRY_DIAL_CODES: Record<string, string> = {
  AF: '+93',
  AL: '+355',
  DZ: '+213',
  AD: '+376',
  AO: '+244',
  AG: '+1-268',
  AR: '+54',
  AM: '+374',
  AU: '+61',
  AT: '+43',
  AZ: '+994',
  BS: '+1-242',
  BH: '+973',
  BD: '+880',
  BB: '+1-246',
  BY: '+375',
  BE: '+32',
  BZ: '+501',
  BJ: '+229',
  BT: '+975',
  BO: '+591',
  BA: '+387',
  BW: '+267',
  BR: '+55',
  BN: '+673',
  BG: '+359',
  BF: '+226',
  BI: '+257',
  CV: '+238',
  KH: '+855',
  CM: '+237',
  CA: '+1',
  CF: '+236',
  TD: '+235',
  CL: '+56',
  CN: '+86',
  CO: '+57',
  KM: '+269',
  CG: '+242',
  CD: '+243',
  CR: '+506',
  CI: '+225',
  HR: '+385',
  CU: '+53',
  CY: '+357',
  CZ: '+420',
  DK: '+45',
  DJ: '+253',
  DM: '+1-767',
  DO: '+1-809',
  EC: '+593',
  EG: '+20',
  SV: '+503',
  GQ: '+240',
  ER: '+291',
  EE: '+372',
  SZ: '+268',
  ET: '+251',
  FJ: '+679',
  FI: '+358',
  FR: '+33',
  GA: '+241',
  GM: '+220',
  GE: '+995',
  DE: '+49',
  GH: '+233',
  GR: '+30',
  GD: '+1-473',
  GT: '+502',
  GN: '+224',
  GW: '+245',
  GY: '+592',
  HT: '+509',
  HN: '+504',
  HU: '+36',
  IS: '+354',
  IN: '+91',
  ID: '+62',
  IR: '+98',
  IQ: '+964',
  IE: '+353',
  IL: '+972',
  IT: '+39',
  JM: '+1-876',
  JP: '+81',
  JO: '+962',
  KZ: '+7',
  KE: '+254',
  KI: '+686',
  KP: '+850',
  KR: '+82',
  KW: '+965',
  KG: '+996',
  LA: '+856',
  LV: '+371',
  LB: '+961',
  LS: '+266',
  LR: '+231',
  LY: '+218',
  LI: '+423',
  LT: '+370',
  LU: '+352',
  MG: '+261',
  MW: '+265',
  MY: '+60',
  MV: '+960',
  ML: '+223',
  MT: '+356',
  MH: '+692',
  MR: '+222',
  MU: '+230',
  MX: '+52',
  FM: '+691',
  MD: '+373',
  MC: '+377',
  MN: '+976',
  ME: '+382',
  MA: '+212',
  MZ: '+258',
  MM: '+95',
  NA: '+264',
  NR: '+674',
  NP: '+977',
  NL: '+31',
  NZ: '+64',
  NI: '+505',
  NE: '+227',
  NG: '+234',
  NO: '+47',
  OM: '+968',
  PK: '+92',
  PW: '+680',
  PA: '+507',
  PG: '+675',
  PY: '+595',
  PE: '+51',
  PH: '+63',
  PL: '+48',
  PT: '+351',
  QA: '+974',
  RO: '+40',
  RU: '+7',
  RW: '+250',
  KN: '+1-869',
  LC: '+1-758',
  VC: '+1-784',
  WS: '+685',
  SM: '+378',
  ST: '+239',
  SA: '+966',
  SN: '+221',
  RS: '+381',
  SC: '+248',
  SL: '+232',
  SG: '+65',
  SK: '+421',
  SI: '+386',
  SB: '+677',
  SO: '+252',
  ZA: '+27',
  SS: '+211',
  ES: '+34',
  LK: '+94',
  SD: '+249',
  SR: '+597',
  SE: '+46',
  CH: '+41',
  SY: '+963',
  TW: '+886',
  TJ: '+992',
  TZ: '+255',
  TH: '+66',
  TL: '+670',
  TG: '+228',
  TO: '+676',
  TT: '+1-868',
  TN: '+216',
  TR: '+90',
  TM: '+993',
  TV: '+688',
  UG: '+256',
  UA: '+380',
  AE: '+971',
  GB: '+44',
  US: '+1',
  UY: '+598',
  UZ: '+998',
  VU: '+678',
  VE: '+58',
  VN: '+84',
  YE: '+967',
  ZM: '+260',
  ZW: '+263',
};

export { type Vendor }; // Export so parent can use it

/**
 * Comprehensive table for managing vendors.
 * Features search, filtering by type, adding/editing vendors, and requesting products.
 * Displays key metrics like total orders and outstanding amounts for each vendor.
 */
export default function VendorTable({ basePath = '/admin' }: { basePath?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Supplier' | 'Distributor' | 'Service'>(
    'All',
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const { page, limit, total, setPage, setLimit, setTotal } = usePagination(10);
  const [stats, setStats] = useState({ total: 0, active: 0, totalSpending: 0, totalOrders: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendorTarget] = useState<Vendor | null>(null);
  const [requestVendor, setRequestVendor] = useState<Vendor | null>(null);

  const fetchVendorsData = useCallback(async () => {
    setLoading(true);
    try {
      const typeFilter = filterType !== 'All' ? filterType : undefined;
      const res = await getVendors({ page, limit, search, type: typeFilter });
      const rawVendors = res.data || [];

      const mappedVendors: Vendor[] = rawVendors.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        name: v.name as string,
        type: (v.type as 'Supplier' | 'Distributor' | 'Service') || 'Supplier',
        contactPerson: (v.contactPerson as string) || 'N/A',
        phone: (v.phone as string) || 'N/A',
        email: (v.email as string) || 'N/A',
        totalOrders: (v.totalOrders as number) || 0,
        purchaseValue: (v.purchaseValue as number) || 0,
        outstandingAmount: (v.outstandingAmount as number) || 0,
        status: v.status === 'ACTIVE' ? 'Active' : 'On Hold',
        currency: (v.currency as string) || 'QAR',
        countryCode: v.countryCode as string | undefined,
        countryName: v.countryName as string | undefined,
        bankAccounts: (v.bankAccounts as BankAccount[]) || [],
      }));

      setVendors(mappedVendors);
      setTotal(res.total || res.data.length);

      // Fetch global stats if viewing all branches or admin view
      try {
        const globalStats = await getVendorStats();
        setStats({
          total: globalStats.total,
          active: globalStats.active,
          totalSpending: globalStats.totalSpending,
          totalOrders: globalStats.totalOrders,
        });
      } catch (statsErr) {
        console.error('Failed to fetch global vendor stats:', statsErr);
        // Fallback to naive stats if backend fails
        setStats({
          total: res.total || res.data.length,
          active: rawVendors.filter((v: Record<string, unknown>) => v.status === 'ACTIVE').length,
          totalSpending: rawVendors.reduce(
            (sum: number, v: Record<string, unknown>) => sum + (Number(v.purchaseValue) || 0),
            0,
          ),
          totalOrders: rawVendors.reduce(
            (sum: number, v: Record<string, unknown>) => sum + (Number(v.totalOrders) || 0),
            0,
          ),
        });
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterType, setTotal]);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVendorsData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchVendorsData]);

  const onRefresh = fetchVendorsData;

  const handleSave = async (data: VendorFormData) => {
    try {
      // Helper to map UI status back to API status
      const apiData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        type: data.type,
        contactPerson: data.contactPerson,
        status: (data.status === 'Active' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
        currency: data.currency,
        countryCode: data.countryCode || undefined,
        countryName: data.countryName || undefined,
        bankAccounts: data.bankAccounts || [],
      };

      if (editingVendor) {
        await updateVendor(editingVendor.id, apiData);
      } else {
        await createVendor(apiData);
      }

      onRefresh(); // Refresh list
      setFormOpen(false);
      setEditingVendor(null);
    } catch (err: unknown) {
      console.error('Failed to save vendor', err);
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to save vendor');
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to save vendor');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteVendor) return;
    try {
      await apiDeleteVendor(deleteVendor.id);
      onRefresh(); // Refresh list
      setDeleteVendorTarget(null);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message || 'Failed to delete vendor');
      } else if (err instanceof Error) {
        toast.error(err.message || 'Failed to delete vendor');
      } else {
        toast.error('Failed to delete vendor');
      }
    }
  };

  const handleRequestProducts = async (data: { products: string; message: string }) => {
    if (!requestVendor) return;
    try {
      await requestProducts(requestVendor.id, data);
      toast.success(`Request sent to ${requestVendor.name}`);
      setRequestVendor(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to send request');
    }
  };

  return (
    <div className="space-y-4">
      <VendorStats
        totalVendors={stats.total}
        activeVendors={stats.active}
        totalSpending={stats.totalSpending}
        totalOrders={stats.totalOrders}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-4 pt-4">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-card border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-card border-blue-400/60">
                <Filter className="h-4 w-4" />
                Filter: {filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType('All')}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Supplier')}>
                Supplier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Distributor')}>
                Distributor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Service')}>Service</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-primary text-white gap-2"
            onClick={() => {
              setEditingVendor(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Vendor
          </Button>
        </div>
      </div>

      <StandardTable
        columns={[
          {
            id: 'name',
            header: 'VENDOR NAME',
            accessorKey: 'name' as keyof Vendor,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'code',
            header: 'CODE',
            cell: (v: Vendor) => `VND-${v.id.substring(0, 4)}`,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'type',
            header: 'TYPE',
            className: 'font-semibold text-[11px] text-primary uppercase',
            cell: (v: Vendor) => (
              <span
                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  v.type === 'Supplier'
                    ? 'bg-blue-100 text-blue-700'
                    : v.type === 'Distributor'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                }`}
              >
                {v.type}
              </span>
            ),
          },
          {
            id: 'contact',
            header: 'CONTACT',
            accessorKey: 'contactPerson' as keyof Vendor,
            className: 'font-semibold text-[11px] text-primary uppercase',
          },
          {
            id: 'orders',
            header: 'ORDERS',
            cell: (v: Vendor) => v.totalOrders,
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[80px]',
          },
          {
            id: 'purchase',
            header: 'PURCHASE VALUE',
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[120px]',
            cell: (v: Vendor) => (
              <span className="font-bold text-primary">
                {formatCurrency(v.purchaseValue, v.currency)}
              </span>
            ),
          },
          {
            id: 'outstanding',
            header: 'OUTSTANDING',
            className: 'text-right font-semibold text-[11px] text-primary uppercase w-[120px]',
            cell: (v: Vendor) => (
              <span className="font-bold text-red-600">
                {formatCurrency(v.outstandingAmount, v.currency)}
              </span>
            ),
          },
          {
            id: 'status',
            header: 'STATUS',
            className: 'font-semibold text-[11px] text-primary uppercase w-[100px]',
            cell: (v: Vendor) => (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                  v.status === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${v.status === 'Active' ? 'bg-green-600' : 'bg-yellow-600'}`}
                />
                {v.status}
              </span>
            ),
          },
          {
            id: 'actions',
            header: 'ACTIONS',
            className: 'text-right font-semibold text-[11px] text-primary uppercase',
            cell: (v: Vendor) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => router.push(`${basePath}/vendors/${v.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setEditingVendor(v);
                    setFormOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                  title="Create RFQ"
                  onClick={() => router.push(`${basePath}/rfqs/create?vendorId=${v.id}`)}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteVendorTarget(v)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={vendors}
        loading={loading}
        emptyMessage="No vendors found matching your criteria."
        keyExtractor={(v) => v.id}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* MODALS */}
      <VendorFormModal
        initialData={editingVendor}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onConfirm={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteVendor}
        onOpenChange={(open) => !open && setDeleteVendorTarget(null)}
        title="Delete Vendor?"
        itemName={deleteVendor?.name}
        onConfirm={confirmDelete}
      />

      {requestVendor && (
        <RequestProductDialog
          open={!!requestVendor}
          onOpenChange={(open) => !open && setRequestVendor(null)}
          vendor={requestVendor}
          onConfirm={handleRequestProducts}
        />
      )}
    </div>
  );
}

const BLANK_BANK: BankAccount = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  routingNumber: '',
  swiftCode: '',
  iban: '',
  ifscCode: '',
  isPrimary: false,
};

function VendorFormModal({
  initialData,
  open,
  onClose,
  onConfirm,
}: {
  initialData: Vendor | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: VendorFormData) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [addingBank, setAddingBank] = React.useState(false);
  const [bankDraft, setBankDraft] = React.useState<BankAccount>({ ...BLANK_BANK });

  const [form, setForm] = useState<VendorFormData>({
    name: '',
    type: 'Supplier',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'Active',
    currency: 'QAR',
    countryCode: undefined,
    countryName: undefined,
    bankAccounts: [],
  });

  React.useEffect(() => {
    if (open) {
      setAddingBank(false);
      setBankDraft({ ...BLANK_BANK });
      if (initialData) {
        setForm({
          name: initialData.name,
          type: initialData.type,
          contactPerson: initialData.contactPerson,
          phone: initialData.phone,
          email: initialData.email,
          status: initialData.status,
          currency: initialData.currency || 'QAR',
          countryCode: initialData.countryCode,
          countryName: initialData.countryName,
          bankAccounts: initialData.bankAccounts || [],
        });
      } else {
        setForm({
          name: '',
          type: 'Supplier',
          contactPerson: '',
          phone: '',
          email: '',
          status: 'Active',
          currency: 'QAR',
          countryCode: undefined,
          countryName: undefined,
          bankAccounts: [],
        });
      }
    }
  }, [initialData, open]);

  const handleCountrySelect = (code: string, name: string) => {
    const suggestedCurrency = COUNTRY_TO_CURRENCY_MAP[code];
    const dialCode = COUNTRY_DIAL_CODES[code];
    setForm((f) => {
      const currentPhone = f.phone.trim();
      const existingDialCode = Object.values(COUNTRY_DIAL_CODES).find((d) =>
        currentPhone.startsWith(d),
      );
      const phoneBase = existingDialCode
        ? currentPhone.slice(existingDialCode.length).trim()
        : currentPhone;
      return {
        ...f,
        countryCode: code,
        countryName: name,
        currency: suggestedCurrency || f.currency,
        phone: dialCode ? `${dialCode}${phoneBase ? ' ' + phoneBase : ''}` : f.phone,
      };
    });
    setCountryOpen(false);
  };

  const addBankAccount = () => {
    if (!bankDraft.bankName || !bankDraft.accountNumber || !bankDraft.accountHolderName) {
      toast.error('Bank name, account holder name and account number are required');
      return;
    }
    const newAccounts = bankDraft.isPrimary
      ? form.bankAccounts.map((a) => ({ ...a, isPrimary: false }))
      : [...form.bankAccounts];
    setForm((f) => ({ ...f, bankAccounts: [...newAccounts, { ...bankDraft }] }));
    setBankDraft({ ...BLANK_BANK });
    setAddingBank(false);
  };

  const removeBankAccount = (idx: number) => {
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.filter((_, i) => i !== idx) }));
  };

  const setPrimary = (idx: number) => {
    setForm((f) => ({
      ...f,
      bankAccounts: f.bankAccounts.map((a, i) => ({ ...a, isPrimary: i === idx })),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            {initialData ? 'Update Vendor' : 'Add Vendor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Vendor Name
              </label>
              <Input
                placeholder="Enter vendor name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Contact Person
              </label>
              <Input
                placeholder="Contact person"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="h-11 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Type
              </label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as VendorFormData['type'] })}
              >
                <SelectTrigger className="h-11 rounded-xl bg-card border-none shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <Input
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-11 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            {/* Country combobox */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Country
              </label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full h-11 rounded-xl bg-card border-none shadow-sm justify-between font-normal text-sm"
                  >
                    {form.countryCode
                      ? `${form.countryCode} — ${form.countryName}`
                      : 'Select country...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {ALL_COUNTRIES.map((c) => (
                          <CommandItem
                            key={c.code}
                            value={`${c.code} ${c.name}`}
                            onSelect={() => handleCountrySelect(c.code, c.name)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                form.countryCode === c.code ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="font-mono text-xs text-gray-400 w-8 shrink-0">
                              {c.code}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone with dial-code prefix */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Phone
              </label>
              <div className="flex h-11 rounded-xl bg-card shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
                <div className="flex items-center px-3 bg-blue-50 border-r border-blue-100 text-xs font-mono font-bold text-blue-600 whitespace-nowrap shrink-0 min-w-[52px] justify-center">
                  {form.countryCode && COUNTRY_DIAL_CODES[form.countryCode]
                    ? COUNTRY_DIAL_CODES[form.countryCode]
                    : '+--'}
                </div>
                <input
                  type="tel"
                  placeholder={
                    form.countryCode && COUNTRY_DIAL_CODES[form.countryCode]
                      ? 'number'
                      : 'select country first'
                  }
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 h-full px-3 bg-transparent text-sm outline-none placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Currency (auto-filled, manually overridable) */}
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Currency{' '}
                <span className="text-blue-400 normal-case font-normal">(auto from country)</span>
              </label>
              <Input
                placeholder="e.g. QAR, USD, INR"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                maxLength={10}
                className="h-11 rounded-xl bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 font-mono"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as VendorFormData['status'] })}
              >
                <SelectTrigger className="h-11 rounded-xl bg-card border-none shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bank Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Bank Accounts ({form.bankAccounts.length})
              </label>
              {!addingBank && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1 border-blue-200 text-blue-700"
                  onClick={() => {
                    setAddingBank(true);
                    setBankDraft({ ...BLANK_BANK });
                  }}
                >
                  <Plus className="h-3 w-3" /> Add Bank Account
                </Button>
              )}
            </div>

            {/* Existing bank accounts list */}
            {form.bankAccounts.length > 0 && (
              <div className="space-y-2">
                {form.bankAccounts.map((acc, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${acc.isPrimary ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-card'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{acc.bankName}</span>
                        {acc.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">{acc.accountHolderName}</p>
                      <p className="text-[11px] font-mono text-gray-600">{acc.accountNumber}</p>
                      {(acc.swiftCode || acc.iban || acc.ifscCode) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {acc.swiftCode && `SWIFT: ${acc.swiftCode}`}
                          {acc.iban && ` • IBAN: ${acc.iban}`}
                          {acc.ifscCode && ` • IFSC: ${acc.ifscCode}`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {!acc.isPrimary && (
                        <button
                          type="button"
                          title="Set as primary"
                          onClick={() => setPrimary(idx)}
                          className="p-1 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeBankAccount(idx)}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add bank account inline form */}
            {addingBank && (
              <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-3">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  New Bank Account
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Bank Name *
                    </label>
                    <Input
                      placeholder="e.g. QNB"
                      value={bankDraft.bankName}
                      onChange={(e) => setBankDraft((d) => ({ ...d, bankName: e.target.value }))}
                      className="h-9 text-sm rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Account Holder *
                    </label>
                    <Input
                      placeholder="Full name on account"
                      value={bankDraft.accountHolderName}
                      onChange={(e) =>
                        setBankDraft((d) => ({ ...d, accountHolderName: e.target.value }))
                      }
                      className="h-9 text-sm rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Account Number *
                    </label>
                    <Input
                      placeholder="Account number"
                      value={bankDraft.accountNumber}
                      onChange={(e) =>
                        setBankDraft((d) => ({ ...d, accountNumber: e.target.value }))
                      }
                      className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      SWIFT / BIC
                    </label>
                    <Input
                      placeholder="e.g. QNBAQAQA"
                      value={bankDraft.swiftCode || ''}
                      onChange={(e) => setBankDraft((d) => ({ ...d, swiftCode: e.target.value }))}
                      className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">IBAN</label>
                    <Input
                      placeholder="IBAN (if applicable)"
                      value={bankDraft.iban || ''}
                      onChange={(e) => setBankDraft((d) => ({ ...d, iban: e.target.value }))}
                      className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      IFSC Code
                    </label>
                    <Input
                      placeholder="IFSC (India only)"
                      value={bankDraft.ifscCode || ''}
                      onChange={(e) => setBankDraft((d) => ({ ...d, ifscCode: e.target.value }))}
                      className="h-9 text-sm font-mono rounded-lg bg-card border-none shadow-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!bankDraft.isPrimary}
                        onChange={(e) =>
                          setBankDraft((d) => ({ ...d, isPrimary: e.target.checked }))
                        }
                        className="rounded"
                      />
                      <span className="text-xs font-semibold text-gray-600">
                        Set as primary account
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" className="h-8 text-xs" onClick={addBankAccount}>
                    Add Account
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setAddingBank(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              className="h-11 px-10"
              disabled={isSubmitting}
              onClick={async () => {
                if (!form.name.trim()) {
                  toast.error('Vendor name is required');
                  return;
                }
                if (!form.email.trim()) {
                  toast.error('Email is required');
                  return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
                  toast.error('Enter a valid email address');
                  return;
                }

                // Auto-commit bank draft if the inline form is open and has any data
                let finalBankAccounts = form.bankAccounts;
                const draftHasData =
                  bankDraft.bankName || bankDraft.accountHolderName || bankDraft.accountNumber;
                if (addingBank && draftHasData) {
                  if (
                    !bankDraft.bankName ||
                    !bankDraft.accountHolderName ||
                    !bankDraft.accountNumber
                  ) {
                    toast.error(
                      'Please complete the bank account details (Bank Name, Account Holder Name, Account Number) or cancel the bank form before saving',
                    );
                    return;
                  }
                  const existingAccounts = bankDraft.isPrimary
                    ? form.bankAccounts.map((a) => ({ ...a, isPrimary: false }))
                    : [...form.bankAccounts];
                  finalBankAccounts = [...existingAccounts, { ...bankDraft }];
                }

                setIsSubmitting(true);
                try {
                  await onConfirm({ ...form, bankAccounts: finalBankAccounts });
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
