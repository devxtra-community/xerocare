'use client';

import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer, Customer, CreateCustomerData } from '@/lib/customer';
import CustomerFormDialog from '@/components/employeeComponents/CustomerFormDialog';
import { getAllProducts, Product } from '@/lib/product';
import { getBrands, createBrand, Brand } from '@/lib/brand';
import { getAllModels, addModel, Model } from '@/lib/model';
import { CustomerServiceHistory, WarrantyInfo } from '@/lib/serviceTicket';
import {
  getServiceContracts,
  createServiceContract,
  updateServiceContract,
  deleteServiceContract,
  recordContractMeterReading,
  getContractMeterReadings,
  registerExternalMachine,
  ServiceContract,
  ContractMeterReading,
  ContractCoverage,
  ServiceContractType,
  FsmaBillingMode,
  ContractInitialPayment,
} from '@/lib/serviceContract';
import { getAccountSummary, PaymentSummary } from '@/lib/payment';
import { recordSalePayment } from '@/lib/saleWorkflow';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import { InvoiceViewDialog } from '@/components/employeeComponents/InvoiceViewDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  Activity,
  Layers,
  Gauge,
  Check,
  X,
  Eye,
  Loader2,
  Package,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductDetailModal } from '@/components/shared/ProductDetailModal';
import { getUserFromToken } from '@/lib/auth';
import { EmployeeJob } from '@/lib/employeeJob';

import { getActiveCurrency } from '@/lib/currency';
interface CustomerMachine {
  id: string;
  modelName: string;
  serialNumber: string;
  ownership: string;
  warrantyEnd: string;
  activeContract: string;
  contractExpiry?: string;
  underWarranty?: boolean;
  warrantyInfo?: WarrantyInfo;
  meterReading?: number | null;
}

interface BillingHistoryInvoice {
  productAllocations?: Array<{
    productId?: string;
    id: string;
    modelName?: string;
    serialNumber?: string;
    effectiveTo?: string;
    warrantyInfo?: WarrantyInfo;
  }>;
  effectiveTo?: string;
}

/**
 * Renders the server-computed warranty verdict as a short label,
 * e.g. "Active until 10/07/2028 · 1,000,000 copies left" or "Expired (COPIES)".
 */
const formatWarranty = (w?: WarrantyInfo | null): { text: string; active: boolean } => {
  if (!w) return { text: 'N/A', active: false };
  if (w.fullCoverage) return { text: 'Fully Covered', active: true };
  if (w.isUnderWarranty) {
    const parts: string[] = [];
    if (w.warrantyEndDate) parts.push(`until ${new Date(w.warrantyEndDate).toLocaleDateString()}`);
    if (w.copyLimit != null && w.copiesRemaining != null)
      parts.push(`${w.copiesRemaining.toLocaleString()} copies left`);
    return { text: parts.length > 0 ? `Active ${parts.join(' · ')}` : 'Active', active: true };
  }
  return { text: w.expiredBy ? `Expired (${w.expiredBy})` : 'Expired', active: false };
};

/**
 * Coverage is fixed per plan (mirrors the server, which enforces it):
 * - AMC : monthly fee → free labour/visits; parts & toner billed as used.
 * - SMA : 1 year + copy limit → labour, visits and parts free; toner billed;
 *         copies beyond the limit billed per copy.
 * - FSMA: all inclusive (toner too), billed monthly per click.
 */
const COVERAGE_BY_TYPE: Record<ServiceContractType, ContractCoverage> = {
  AMC: { labour: true, spareParts: false, toner: false, travel: true },
  SMA: { labour: true, spareParts: true, toner: false, travel: true },
  FSMA: { labour: true, spareParts: true, toner: true, travel: true },
};

const PLAN_SUMMARY: Record<ServiceContractType, string> = {
  AMC: 'Fixed annual fee, invoiced in full at signing and paid in one or more installments. Service visits & labour free — spare parts and toner are charged as used.',
  SMA: 'One year + copy limit (whichever first). Visits, labour & spare parts free — toner is charged. Copies beyond the limit are billed at a per-copy rate.',
  FSMA: 'All inclusive (parts, toner, labour). Billed monthly per click — individual B&W/colour rates or one combined rate.',
};

const COVERAGE_LABELS: Array<{ key: keyof ContractCoverage; label: string }> = [
  { key: 'labour', label: 'Labour' },
  { key: 'spareParts', label: 'Spare Parts' },
  { key: 'toner', label: 'Toner' },
  { key: 'travel', label: 'Visits / Travel' },
];

type ContractFormState = {
  customerId: string;
  productId: string;
  contractType: ServiceContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  status: string;
  notes: string;
  monthlyCharge: string;
  copyLimit: string;
  overagePerCopyRate: string;
  startMeterReading: string;
  fsmaBillingMode: FsmaBillingMode;
  ratePerClickBW: string;
  ratePerClickColor: string;
  ratePerClickCombined: string;
  startMeterBW: string;
  startMeterColor: string;
};

const emptyForm = (): ContractFormState => ({
  customerId: '',
  productId: '',
  contractType: 'FSMA',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    .toISOString()
    .split('T')[0],
  contractValue: 0,
  status: 'ACTIVE',
  notes: '',
  monthlyCharge: '',
  copyLimit: '',
  overagePerCopyRate: '',
  startMeterReading: '',
  fsmaBillingMode: 'COMBINED',
  ratePerClickBW: '',
  ratePerClickColor: '',
  ratePerClickCombined: '',
  startMeterBW: '',
  startMeterColor: '',
});

export default function ServiceContractsPage() {
  const router = useRouter();
  // Vendor purchasing/contact info isn't relevant here (Service Desk); Lot info is
  // additionally hidden for Service Technicians specifically, who also use this page.
  const [isServiceTechnician, setIsServiceTechnician] = useState(false);
  useEffect(() => {
    setIsServiceTechnician(getUserFromToken()?.employeeJob === EmployeeJob.SERVICE_TECHNICIAN);
  }, []);
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ServiceContract | null>(null);

  // Form State
  const [formState, setFormState] = useState<ContractFormState>(emptyForm());

  // AMC — amount collected at signing (invoiced immediately, recorded against that invoice)
  const [initialPaymentForm, setInitialPaymentForm] = useState({
    amount: '',
    paymentMode: 'CASH' as ContractInitialPayment['paymentMode'],
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });

  // AMC — invoice paid/pending status per contract's invoiceId, and the installment payment dialog
  const [contractPaymentSummaries, setContractPaymentSummaries] = useState<
    Record<string, PaymentSummary>
  >({});
  const [payingContract, setPayingContract] = useState<ServiceContract | null>(null);
  const [payingForm, setPayingForm] = useState({
    amount: '',
    paymentMode: 'CASH' as ContractInitialPayment['paymentMode'],
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Contract invoice — view / download / email / WhatsApp send
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [loadingInvoiceView, setLoadingInvoiceView] = useState(false);

  const openContractInvoice = async (contract: ServiceContract) => {
    if (!contract.invoiceId) return;
    setLoadingInvoiceView(true);
    try {
      setViewingInvoice(await getInvoiceById(contract.invoiceId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load invoice.', { description: getApiErrorMessage(error) });
    } finally {
      setLoadingInvoiceView(false);
    }
  };

  // Meter reading / monthly billing dialog
  const [billingContract, setBillingContract] = useState<ServiceContract | null>(null);
  const [readings, setReadings] = useState<ContractMeterReading[]>([]);
  const [totalBilled, setTotalBilled] = useState(0);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [readingForm, setReadingForm] = useState({
    totalReading: '',
    bwReading: '',
    colorReading: '',
    notes: '',
  });

  // External machine registration (machines bought elsewhere)
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [externalForm, setExternalForm] = useState({
    brand: '',
    modelName: '',
    serialNumber: '',
    meterReading: '',
    printColour: 'BLACK_WHITE' as 'BLACK_WHITE' | 'COLOUR' | 'BOTH',
    description: '',
  });

  // Brand/model catalog — same "Other Machine" pattern as service ticket raising
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', description: '' });
  const [creatingBrandState, setCreatingBrandState] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const [modelForm, setModelForm] = useState({
    model_no: '',
    model_name: '',
    brand_id: '',
    description: '',
  });
  const [creatingModelState, setCreatingModelState] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const [customerIntel, setCustomerIntel] = useState<CustomerServiceHistory | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // Meter reading asked from the customer to verify a copy-limited warranty
  const [meterReadingInput, setMeterReadingInput] = useState('');
  const [liveWarranty, setLiveWarranty] = useState<WarrantyInfo | null>(null);
  const [checkingWarranty, setCheckingWarranty] = useState(false);

  const refreshIntel = React.useCallback((customerId: string) => {
    setLoadingIntel(true);
    import('@/lib/serviceTicket').then(({ getCustomerServiceHistory }) => {
      getCustomerServiceHistory(customerId)
        .then((res) => {
          setCustomerIntel(res);
        })
        .catch((err) => {
          console.error('Error fetching customer history:', err);
          setCustomerIntel(null);
        })
        .finally(() => {
          setLoadingIntel(false);
        });
    });
  }, []);

  useEffect(() => {
    if (formState.customerId) {
      refreshIntel(formState.customerId);
    } else {
      setCustomerIntel(null);
    }
  }, [formState.customerId, refreshIntel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, customersData, productsData, brandsRes, modelsRes] = await Promise.all([
        getServiceContracts(),
        getCustomers(),
        getAllProducts({ limit: 1000 }),
        getBrands().catch(() => ({ success: false, data: [] })),
        getAllModels({ limit: 1000 }).catch(() => ({ data: [] })),
      ]);
      setContracts(contractsData);
      setCustomers(customersData);
      setProducts(productsData);
      setBrands(brandsRes.data || []);
      setModels(modelsRes.data || []);

      // Every contract carries a lump-sum invoice raised at signing — pull its paid/pending status for the list.
      const contractInvoiceIds = [
        ...new Set(contractsData.filter((c) => c.invoiceId).map((c) => c.invoiceId as string)),
      ];
      if (contractInvoiceIds.length > 0) {
        const summaries = await Promise.all(
          contractInvoiceIds.map((invId) => getAccountSummary(invId).catch(() => null)),
        );
        const map: Record<string, PaymentSummary> = {};
        summaries.forEach((s, idx) => {
          if (s) map[contractInvoiceIds[idx]] = s;
        });
        setContractPaymentSummaries(map);
      } else {
        setContractPaymentSummaries({});
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contract and machine details', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (data: Partial<CreateCustomerData>) => {
    try {
      const payload: CreateCustomerData = {
        name: data.name!,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: data.status,
        vatNumber: data.vatNumber,
        country: data.country,
        stateProvince: data.stateProvince,
        city: data.city,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccounts: data.bankAccounts,
        totalPurchase: 0,
        source: 'DIRECT',
      };
      const newCustomer = await createCustomer(payload);
      toast.success('Customer created successfully');
      setCustomers((prev) => [...prev, newCustomer]);
      setFormState((prev) => ({ ...prev, customerId: newCustomer.id, productId: '' }));
    } catch (error) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create customer');
      throw error;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingContract(null);
    setFormState(emptyForm());
    setInitialPaymentForm({
      amount: '',
      paymentMode: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contract: ServiceContract) => {
    setEditingContract(contract);
    const numStr = (v: number | null | undefined) =>
      v === null || v === undefined ? '' : String(v);
    setFormState({
      customerId: contract.customerId,
      productId: contract.productId,
      contractType: contract.contractType,
      startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
      endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
      contractValue: contract.contractValue || 0,
      status: contract.status || 'ACTIVE',
      notes: contract.notes || '',
      monthlyCharge: numStr(contract.monthlyCharge),
      copyLimit: numStr(contract.copyLimit),
      overagePerCopyRate: numStr(contract.overagePerCopyRate),
      startMeterReading: numStr(contract.startMeterReading),
      fsmaBillingMode: contract.fsmaBillingMode || 'COMBINED',
      ratePerClickBW: numStr(contract.ratePerClickBW),
      ratePerClickColor: numStr(contract.ratePerClickColor),
      ratePerClickCombined: numStr(contract.ratePerClickCombined),
      startMeterBW: numStr(contract.startMeterBW),
      startMeterColor: numStr(contract.startMeterColor),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (!formState.productId) {
      toast.error('Please select a machine/product.');
      return;
    }

    const type = formState.contractType;
    if (type !== 'FSMA' && (!formState.contractValue || Number(formState.contractValue) <= 0)) {
      toast.error('Enter a contract value greater than 0 — it is invoiced in full at signing.');
      return;
    }
    if (type === 'SMA') {
      if (!formState.copyLimit || Number(formState.copyLimit) <= 0) {
        toast.error('SMA contracts need a copy limit.');
        return;
      }
      if (formState.startMeterReading === '') {
        toast.error('Enter the machine current meter reading — SMA usage is counted from it.');
        return;
      }
    }
    if (type === 'FSMA') {
      if (formState.fsmaBillingMode === 'INDIVIDUAL') {
        if (formState.ratePerClickBW === '' || formState.ratePerClickColor === '') {
          toast.error('Enter per-click rates for both B&W and colour.');
          return;
        }
        if (formState.startMeterBW === '' || formState.startMeterColor === '') {
          toast.error('Enter the starting B&W and colour meter readings.');
          return;
        }
      } else {
        if (formState.ratePerClickCombined === '') {
          toast.error('Enter the combined per-click rate.');
          return;
        }
        if (formState.startMeterReading === '') {
          toast.error('Enter the starting total meter reading.');
          return;
        }
      }
    }

    const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));
    const payload: Partial<ServiceContract> = {
      customerId: formState.customerId,
      productId: formState.productId,
      contractType: type,
      startDate: formState.startDate,
      endDate: formState.endDate,
      contractValue: type === 'FSMA' ? 0 : Number(formState.contractValue) || 0,
      status: formState.status,
      notes: formState.notes || null,
      monthlyCharge: numOrUndef(formState.monthlyCharge),
      copyLimit: numOrUndef(formState.copyLimit),
      overagePerCopyRate: numOrUndef(formState.overagePerCopyRate),
      startMeterReading: numOrUndef(formState.startMeterReading),
      fsmaBillingMode: type === 'FSMA' ? formState.fsmaBillingMode : undefined,
      ratePerClickBW: numOrUndef(formState.ratePerClickBW),
      ratePerClickColor: numOrUndef(formState.ratePerClickColor),
      ratePerClickCombined: numOrUndef(formState.ratePerClickCombined),
      startMeterBW: numOrUndef(formState.startMeterBW),
      startMeterColor: numOrUndef(formState.startMeterColor),
    };

    const initialPayment: ContractInitialPayment | undefined =
      !editingContract && Number(initialPaymentForm.amount) > 0
        ? {
            amount: Number(initialPaymentForm.amount),
            paymentMode: initialPaymentForm.paymentMode,
            paymentDate: initialPaymentForm.paymentDate,
            referenceNumber: initialPaymentForm.referenceNumber || undefined,
            remarks: initialPaymentForm.remarks || undefined,
          }
        : undefined;

    try {
      if (editingContract) {
        await updateServiceContract(editingContract.id, payload);
        toast.success('Service contract updated successfully.');
      } else {
        await createServiceContract({ ...payload, initialPayment });
        toast.success(
          type === 'AMC'
            ? 'AMC contract registered and invoice raised.'
            : 'Service contract registered successfully.',
        );
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save service contract.', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    }
  };

  // ── AMC installment payments (against the invoice raised at signing) ──
  const openPaymentDialog = (contract: ServiceContract) => {
    setPayingContract(contract);
    setPayingForm({
      amount: '',
      paymentMode: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    });
  };

  const handleRecordContractPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingContract?.invoiceId) return;
    const amount = Number(payingForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a payment amount greater than 0.');
      return;
    }
    setSavingPayment(true);
    try {
      await recordSalePayment(payingContract.invoiceId!, {
        amount,
        paymentMode: payingForm.paymentMode as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
        paymentDate: payingForm.paymentDate,
        referenceNumber: payingForm.referenceNumber || undefined,
        remarks: payingForm.remarks || undefined,
      });
      toast.success('Payment submitted for Finance approval.');
      setPayingContract(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to record payment.', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  // ── Meter reading / monthly billing ────────────────────────────────────
  const openBillingDialog = async (contract: ServiceContract) => {
    setBillingContract(contract);
    setReadingForm({ totalReading: '', bwReading: '', colorReading: '', notes: '' });
    setLoadingReadings(true);
    try {
      const res = await getContractMeterReadings(contract.id);
      setReadings(res.readings);
      setTotalBilled(res.totalBilled);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load meter reading history.', {
        description: getApiErrorMessage(error),
      });
      setReadings([]);
      setTotalBilled(0);
    } finally {
      setLoadingReadings(false);
    }
  };

  const lastReading = readings.length > 0 ? readings[0] : null;

  /** Client-side mirror of the server billing math, for a live preview. */
  const readingPreview: { amount?: number; detail?: string; error?: string } | null = (() => {
    if (!billingContract) return null;
    const c = billingContract;
    const num = (v: string) => (v === '' || isNaN(Number(v)) ? null : Number(v));

    if (c.contractType === 'AMC') {
      // AMC readings are tracking-only — the contract fee is billed separately.
      return null;
    }
    if (c.contractType === 'FSMA' && c.fsmaBillingMode === 'INDIVIDUAL') {
      const bw = num(readingForm.bwReading);
      const color = num(readingForm.colorReading);
      if (bw === null || color === null) return null;
      const prevBW = lastReading?.bwReading ?? c.startMeterBW ?? 0;
      const prevColor = lastReading?.colorReading ?? c.startMeterColor ?? 0;
      const clicksBW = bw - Number(prevBW);
      const clicksColor = color - Number(prevColor);
      if (clicksBW < 0 || clicksColor < 0) return { error: 'Reading below previous meter.' };
      const amount =
        clicksBW * (Number(c.ratePerClickBW) || 0) +
        clicksColor * (Number(c.ratePerClickColor) || 0);
      return {
        amount,
        detail: `${clicksBW.toLocaleString()} B&W + ${clicksColor.toLocaleString()} colour clicks`,
      };
    }
    const total = num(readingForm.totalReading);
    if (total === null) return null;
    const prevTotal = lastReading?.totalReading ?? c.startMeterReading ?? 0;
    const clicks = total - Number(prevTotal);
    if (clicks < 0) return { error: 'Reading below previous meter.' };
    if (c.contractType === 'FSMA') {
      return {
        amount: clicks * (Number(c.ratePerClickCombined) || 0),
        detail: `${clicks.toLocaleString()} clicks this period`,
      };
    }
    // SMA — only overage beyond the copy limit is billed (+ base fee if set)
    const startMeter = Number(c.startMeterReading) || 0;
    const copyLimit = Number(c.copyLimit) || 0;
    const usedToDate = Math.max(0, total - startMeter);
    const prevUsed = Math.max(0, Number(prevTotal) - startMeter);
    const overageClicks = Math.max(0, usedToDate - copyLimit) - Math.max(0, prevUsed - copyLimit);
    const amount =
      overageClicks * (Number(c.overagePerCopyRate) || 0) + (Number(c.monthlyCharge) || 0);
    return {
      amount,
      detail:
        usedToDate > copyLimit
          ? `${usedToDate.toLocaleString()} / ${copyLimit.toLocaleString()} copies used — ${overageClicks.toLocaleString()} excess clicks this period`
          : `${usedToDate.toLocaleString()} / ${copyLimit.toLocaleString()} copies used — within limit`,
    };
  })();

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingContract) return;
    setSavingReading(true);
    try {
      const num = (v: string) => (v === '' ? undefined : Number(v));
      const saved = await recordContractMeterReading(billingContract.id, {
        totalReading: num(readingForm.totalReading),
        bwReading: num(readingForm.bwReading),
        colorReading: num(readingForm.colorReading),
        notes: readingForm.notes || undefined,
      });
      toast.success(
        billingContract.contractType === 'AMC'
          ? 'Meter reading recorded (tracking only — nothing to collect).'
          : `Reading recorded — ${getActiveCurrency()} ${Number(saved.amountCharged).toFixed(2)} to collect for this period.`,
      );
      setReadingForm({ totalReading: '', bwReading: '', colorReading: '', notes: '' });
      const res = await getContractMeterReadings(billingContract.id);
      setReadings(res.readings);
      setTotalBilled(res.totalBilled);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to record meter reading.', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setSavingReading(false);
    }
  };

  // ── External machine registration ──────────────────────────────────────
  const openExternalDialog = () => {
    setExternalForm({
      brand: '',
      modelName: '',
      serialNumber: '',
      meterReading: '',
      printColour: 'BLACK_WHITE',
      description: '',
    });
    setExternalDialogOpen(true);
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;
    try {
      setCreatingBrandState(true);
      setBrandError(null);
      const res = await createBrand({
        name: brandForm.name.trim(),
        description: brandForm.description.trim() || undefined,
      });
      const resBrands = await getBrands().catch(() => ({ success: false, data: [] }));
      setBrands(resBrands.data || []);

      const createdBrand = res.data || res;
      setExternalForm((prev) => ({
        ...prev,
        brand: createdBrand.name || brandForm.name.trim(),
      }));

      setShowCreateBrandModal(false);
      setBrandForm({ name: '', description: '' });
      toast.success('Brand created successfully!');
    } catch (error) {
      console.error('Failed to create brand:', error);
      const msg =
        getApiErrorMessage(error) || 'Failed to create brand. Please check if it already exists.';
      setBrandError(msg);
      toast.error(msg);
    } finally {
      setCreatingBrandState(false);
    }
  };

  const handleOpenCreateModel = () => {
    const defaultBrand = brands.find((b) => b.name === externalForm.brand);
    setModelForm({
      model_no: '',
      model_name: '',
      brand_id: defaultBrand ? defaultBrand.id : '',
      description: '',
    });
    setModelError(null);
    setShowCreateModelModal(true);
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.model_name.trim() || !modelForm.model_no.trim() || !modelForm.brand_id) {
      setModelError('Model Name, Model Number, and Brand are required.');
      return;
    }
    try {
      setCreatingModelState(true);
      setModelError(null);
      const created = await addModel({
        model_name: modelForm.model_name.trim(),
        model_no: modelForm.model_no.trim(),
        brand_id: modelForm.brand_id,
        description: modelForm.description.trim() || modelForm.model_name.trim(),
      });
      const resModels = await getAllModels({ limit: 1000 }).catch(() => ({ data: [] }));
      setModels(resModels.data || []);

      setExternalForm((prev) => ({
        ...prev,
        modelName: created.model_name || modelForm.model_name.trim(),
      }));

      setShowCreateModelModal(false);
      setModelForm({ model_no: '', model_name: '', brand_id: '', description: '' });
      toast.success('Model created successfully!');
    } catch (error) {
      console.error('Failed to create model:', error);
      const msg = getApiErrorMessage(error) || 'Failed to create model. Please try again.';
      setModelError(msg);
      toast.error(msg);
    } finally {
      setCreatingModelState(false);
    }
  };

  const handleSaveExternalMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.customerId) {
      toast.error('Select a customer first.');
      return;
    }
    if (!externalForm.brand.trim() || !externalForm.modelName.trim()) {
      toast.error('Brand and model name are required.');
      return;
    }
    if (!externalForm.serialNumber.trim()) {
      toast.error('Serial number is required.');
      return;
    }
    if (externalForm.meterReading === '' || Number(externalForm.meterReading) < 0) {
      toast.error('Enter the machine current meter reading.');
      return;
    }

    setSavingExternal(true);
    try {
      const machine = await registerExternalMachine({
        customerId: formState.customerId,
        brand: externalForm.brand.trim(),
        modelName: externalForm.modelName.trim(),
        serialNumber: externalForm.serialNumber.trim(),
        meterReading: Number(externalForm.meterReading),
        printColour: externalForm.printColour,
        description: externalForm.description.trim() || undefined,
      });
      toast.success(`External machine ${machine.serial_no} registered.`);
      setExternalDialogOpen(false);
      // Select it for the contract and use its meter as the baseline
      setFormState((prev) => ({
        ...prev,
        productId: machine.id,
        startMeterReading: String(machine.meter_reading ?? externalForm.meterReading),
      }));
      refreshIntel(formState.customerId);
      // Refresh the global products list so table lookups resolve the new machine
      getAllProducts({ limit: 1000 })
        .then(setProducts)
        .catch((err) => console.error('Failed to refresh products:', err));
    } catch (error) {
      console.error(error);
      toast.error('Failed to register external machine.', {
        description: getApiErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setSavingExternal(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteServiceContract(id);
      toast.success('Contract deleted successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete contract.');
    }
  };

  // Filter and search
  const filteredContracts = contracts.filter((c) => {
    const customer = customers.find((cust) => cust.id === c.customerId);
    const product = products.find((prod) => prod.id === c.productId);
    const customerName = customer ? customer.name.toLowerCase() : '';
    const serialNo = (c.machine?.serialNumber || product?.serial_no || '').toLowerCase();
    const modelName = (
      c.machine ? `${c.machine.brand} ${c.machine.modelName}` : product?.name || ''
    ).toLowerCase();

    const matchesSearch =
      customerName.includes(searchTerm.toLowerCase()) ||
      serialNo.includes(searchTerm.toLowerCase()) ||
      modelName.includes(searchTerm.toLowerCase()) ||
      c.contractType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || c.contractType === filterType;

    return matchesSearch && matchesType;
  });

  const getStatusBadgeClass = (status: string) => {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'EXPIRED') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.email || c.phone || 'No contact info',
  }));

  const getCustomerMachines = (intel: CustomerServiceHistory | null): CustomerMachine[] => {
    if (!intel) return [];
    const list: CustomerMachine[] = [];

    // Rented machines are intentionally excluded: they are always fully
    // covered by us and never need a service contract.

    // 1. Leased Machines
    if (intel.billingHistory?.LEASE) {
      (intel.billingHistory.LEASE as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
        const allocations = invObj.productAllocations || [];
        allocations.forEach((alloc) => {
          const warranty = formatWarranty(alloc.warrantyInfo);
          list.push({
            id: alloc.productId || alloc.id,
            modelName: alloc.modelName || 'Leased Printer',
            serialNumber: alloc.serialNumber || 'N/A',
            ownership: 'LEASE',
            warrantyEnd: warranty.text,
            underWarranty: warranty.active,
            warrantyInfo: alloc.warrantyInfo,
            activeContract: 'LEASE',
          });
        });
      });
    }

    // 2. Purchased Machines (SALE)
    if (intel.billingHistory?.SALE) {
      (intel.billingHistory.SALE as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
        const allocations = invObj.productAllocations || [];
        allocations.forEach((alloc) => {
          const warranty = formatWarranty(alloc.warrantyInfo);
          list.push({
            id: alloc.productId || alloc.id,
            modelName: alloc.modelName || 'Purchased Printer',
            serialNumber: alloc.serialNumber || 'N/A',
            ownership: 'SALE',
            warrantyEnd: warranty.text,
            underWarranty: warranty.active,
            warrantyInfo: alloc.warrantyInfo,
            activeContract: 'None',
          });
        });
      });
    }

    // 3. Contract Machines (from AMC, FSMA, SMA)
    const contractTypes = ['AMC', 'FSMA', 'SMA'];
    contractTypes.forEach((cType) => {
      if (intel.billingHistory?.[cType]) {
        (intel.billingHistory[cType] as unknown as BillingHistoryInvoice[]).forEach((invObj) => {
          const allocations = invObj.productAllocations || [];
          allocations.forEach((alloc) => {
            list.push({
              id: alloc.productId || alloc.id,
              modelName: alloc.modelName || `${cType} Printer`,
              serialNumber: alloc.serialNumber || 'N/A',
              ownership: 'CONTRACT',
              warrantyEnd: 'N/A',
              activeContract: cType,
              contractExpiry: alloc.effectiveTo || 'N/A',
            });
          });
        });
      }
    });

    // 4. Assigned Products / External
    if (intel.assignedProducts) {
      intel.assignedProducts.forEach((prod) => {
        // Same rule as above: rented machines are always fully covered and
        // never need a contract, even when reserved/assigned in inventory.
        if (prod.ownership === 'RENT') return;
        if (!list.some((item) => item.serialNumber === prod.serial_no)) {
          list.push({
            id: prod.id,
            modelName: prod.name,
            serialNumber: prod.serial_no,
            ownership: prod.ownership || 'EXTERNAL',
            warrantyEnd: prod.warranty_end_date
              ? new Date(prod.warranty_end_date).toLocaleDateString()
              : 'N/A',
            activeContract: 'None',
          });
        }
      });
    }

    // 5. Overlay live service contracts (AMC/SMA/FSMA live in their own table,
    // not in billing history, so SALE/EXTERNAL machines above default to 'None').
    const activeForCustomer = contracts.filter(
      (c) => c.status === 'ACTIVE' && c.customerId === formState.customerId,
    );
    list.forEach((m) => {
      if (m.activeContract && m.activeContract !== 'None') return;
      const match = activeForCustomer.find(
        (c) =>
          c.productId === m.id ||
          (!!c.machine?.serialNumber && c.machine.serialNumber === m.serialNumber),
      );
      if (match) {
        m.activeContract = match.contractType;
        m.contractExpiry = match.endDate || m.contractExpiry;
      }
    });

    // 6. Overlay the machine's canonical meter reading — kept up to date by
    // ticket creation, technician diagnosis, and contract meter recording
    // (whichever of those happened most recently), so this single lookup
    // reflects "previous service or service contract data" without having
    // to re-derive it from each billing-history shape above.
    list.forEach((m) => {
      const prod = products.find((p) => p.id === m.id);
      if (prod && prod.meter_reading != null) {
        m.meterReading = prod.meter_reading;
      }
    });

    return list;
  };

  const customerMachines = getCustomerMachines(customerIntel);

  const selectedRegistryMachine = customerMachines.find((m) => m.id === formState.productId);
  // Copy-limited warranties can only be verified with the machine's current
  // meter reading, so ask for it when such a machine is selected.
  const needsMeterCheck =
    !!selectedRegistryMachine &&
    (selectedRegistryMachine.ownership === 'SALE' ||
      selectedRegistryMachine.ownership === 'LEASE') &&
    selectedRegistryMachine.warrantyInfo?.copyLimit != null;

  useEffect(() => {
    setMeterReadingInput('');
    setLiveWarranty(null);
  }, [formState.productId]);

  // Prefill contract start meters from the machine's stored lifetime meter;
  // the verified value typed in the warranty check below overrides it.
  useEffect(() => {
    if (editingContract) return;
    const prod = products.find((p) => p.id === formState.productId);
    if (!prod) return;
    const meter = String(prod.meter_reading ?? 0);
    setFormState((prev) => ({
      ...prev,
      startMeterReading: meter,
    }));
  }, [formState.productId, products, editingContract]);

  const selectedSerial = selectedRegistryMachine?.serialNumber;
  useEffect(() => {
    if (
      !needsMeterCheck ||
      meterReadingInput === '' ||
      !selectedSerial ||
      selectedSerial === 'N/A'
    ) {
      setLiveWarranty(null);
      return;
    }
    const reading = Number(meterReadingInput);
    if (isNaN(reading) || reading < 0) {
      setLiveWarranty(null);
      return;
    }
    setCheckingWarranty(true);
    // Debounced so typing doesn't fire a request per keystroke
    const timer = setTimeout(() => {
      import('@/lib/serviceTicket').then(({ getMachineContext }) => {
        getMachineContext(selectedSerial, reading)
          .then((res) => setLiveWarranty(res.warrantyInfo ?? null))
          .catch((err) => {
            console.error('Error checking machine warranty:', err);
            setLiveWarranty(null);
          })
          .finally(() => setCheckingWarranty(false));
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [needsMeterCheck, meterReadingInput, selectedSerial]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Service Contracts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Service Agreements (FSMA, SMA, AMC) for customer and external machines.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service Contract
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total Contracts
            </CardTitle>
            <Layers className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-800">{contracts.length}</div>
            <p className="text-xs text-slate-400 mt-1">All service agreements registered</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active FSMA
            </CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-indigo-600">
              {contracts.filter((c) => c.contractType === 'FSMA' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Full service maintenance contracts</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active SMA
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {contracts.filter((c) => c.contractType === 'SMA' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Service maintenance contracts</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200/80">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active AMC
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {contracts.filter((c) => c.contractType === 'AMC' && c.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Annual maintenance contracts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtering and Search Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, serial number, model, or type..."
            className="pl-9 bg-slate-50/50 focus-visible:ring-blue-500 border-slate-200/80"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {['ALL', 'FSMA', 'SMA', 'AMC'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
              className={`text-xs px-4 py-2 font-medium ${
                filterType === type
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : 'hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-slate-200/80 overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-bold text-xs text-slate-600 w-[16%]">Customer</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[19%]">
                Machine (Model)
              </TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[9%]">Type</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[10%]">Start Date</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[10%]">End Date</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[9%] text-right">
                Value
              </TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[9%]">Status</TableHead>
              <TableHead className="font-bold text-xs text-slate-600 w-[18%] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                  Loading service contracts...
                </TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                  No service contracts found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((c) => {
                const customer = customers.find((cust) => cust.id === c.customerId);
                const product = products.find((prod) => prod.id === c.productId);
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-xs text-slate-800 truncate py-3">
                      {customer ? customer.name : 'Unknown Customer'}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {c.machine
                            ? `${c.machine.brand} ${c.machine.modelName}`
                            : product
                              ? `${product.brand} ${product.name}`
                              : 'Unknown Product'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {c.contractType}
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">
                          {c.contractType === 'AMC' && 'Annual fee — invoiced at signing'}
                          {c.contractType === 'SMA' &&
                            c.copyLimit != null &&
                            (c.usageSummary?.copiesUsed != null
                              ? `${c.usageSummary.copiesUsed.toLocaleString()} / ${Number(c.copyLimit).toLocaleString()} copies`
                              : `${Number(c.copyLimit).toLocaleString()} copy limit`)}
                          {c.contractType === 'FSMA' &&
                            (c.fsmaBillingMode === 'INDIVIDUAL'
                              ? `B&W ${Number(c.ratePerClickBW ?? 0)} · Col ${Number(c.ratePerClickColor ?? 0)}/click`
                              : `${Number(c.ratePerClickCombined ?? 0)}/click`)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-700 text-right py-3">
                      <div className="flex flex-col items-end gap-1">
                        {c.contractType === 'FSMA' ? (
                          <span className="text-slate-400 font-medium">Per-click billing</span>
                        ) : (
                          <span>
                            {getActiveCurrency()} {Number(c.contractValue).toFixed(2)}
                          </span>
                        )}
                        {c.contractType === 'FSMA' ? null : c.invoiceId ? (
                          (() => {
                            const summary = contractPaymentSummaries[c.invoiceId];
                            if (!summary) return null;
                            const paid =
                              summary.pendingBalance <= 0
                                ? 'PAID'
                                : summary.totalPaid > 0
                                  ? 'PARTIAL'
                                  : 'PENDING';
                            const cls =
                              paid === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : paid === 'PARTIAL'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200';
                            return (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${cls}`}
                                title={`Paid ${getActiveCurrency()} ${summary.totalPaid.toFixed(2)} of ${getActiveCurrency()} ${summary.totalAmount.toFixed(2)}`}
                              >
                                {paid}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-50 text-slate-400 border-slate-200">
                            NO INVOICE
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          c.status,
                        )}`}
                      >
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
                        {c.productId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewProductId(c.productId)}
                            title="View machine details"
                            className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Package className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/employee/service/contracts/${c.id}`)}
                          title="View contract details"
                          className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {c.invoiceId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openContractInvoice(c)}
                            disabled={loadingInvoiceView}
                            title="View / download / send invoice"
                            className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBillingDialog(c)}
                          title="Meter readings & monthly billing"
                          className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50"
                        >
                          <Gauge className="h-3.5 w-3.5" />
                        </Button>
                        {c.invoiceId &&
                          (contractPaymentSummaries[c.invoiceId]?.pendingBalance ?? 1) > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPaymentDialog(c)}
                              title="Record an installment payment"
                              className="h-7 w-7 text-slate-500 hover:text-green-600 hover:bg-green-50/50"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {!c.invoiceId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c.id)}
                            title="Delete contract"
                            className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl w-full p-0 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {editingContract ? 'Edit Service Contract' : 'Create Service Contract'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Fill in the form below to configure coverage rules and billing parameters for the
              service agreement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 py-4">
              {/* Customer Selection — fixed for the contract's lifetime once created */}
              <div className="col-span-2 flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">
                    {editingContract ? 'Customer' : 'Select Customer'}
                  </label>
                  {!editingContract && (
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      + New Customer
                    </button>
                  )}
                </div>
                {editingContract ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-semibold text-slate-700">
                      {customers.find((cust) => cust.id === formState.customerId)?.name ||
                        'Unknown Customer'}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      The customer cannot be changed — this contract belongs to them.
                    </span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={customerOptions}
                    value={formState.customerId}
                    onValueChange={(val) =>
                      setFormState((prev) => ({ ...prev, customerId: val, productId: '' }))
                    }
                    placeholder="Choose customer..."
                  />
                )}
              </div>

              {/* CUSTOMER MACHINES SUMMARY PANEL */}
              {formState.customerId && !editingContract && (
                <div className="col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-blue-600" /> Customer Machine Registry &
                      History
                    </h4>
                    <div className="flex items-center gap-2">
                      {loadingIntel && (
                        <span className="text-[10px] text-slate-400 font-normal animate-pulse">
                          Loading machines...
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openExternalDialog}
                        className="h-7 px-2.5 text-[10px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        External Machine
                      </Button>
                    </div>
                  </div>

                  {loadingIntel ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Fetching customer machine details...
                    </div>
                  ) : customerMachines.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No machines registered for this customer. If they bought the machine
                      elsewhere, add it with “External Machine” above.
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                      {customerMachines.map((m, idx) => (
                        <div
                          key={m.id + '-' + m.serialNumber + '-' + idx}
                          onClick={() => {
                            setFormState((prev) => ({ ...prev, productId: m.id }));
                          }}
                          className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 text-left ${
                            formState.productId === m.id
                              ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{m.modelName}</span>
                            <div className="flex items-center gap-1.5">
                              {m.underWarranty && (
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded uppercase">
                                  Still under warranty
                                </span>
                              )}
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                                {m.ownership}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-500 mt-1">
                            <div>
                              Serial:{' '}
                              <span className="font-mono text-slate-700 font-semibold">
                                {m.serialNumber}
                              </span>
                            </div>
                            <div>
                              Meter:{' '}
                              <span className="font-mono text-slate-700 font-semibold">
                                {m.meterReading != null ? m.meterReading.toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              Warranty:{' '}
                              <span
                                className={`font-semibold ${m.underWarranty ? 'text-emerald-700' : 'text-slate-700'}`}
                              >
                                {m.warrantyEnd || 'N/A'}
                              </span>
                            </div>
                            <div>
                              Active Contract:{' '}
                              <span
                                className={`font-bold ${m.activeContract && m.activeContract !== 'None' ? 'text-indigo-600' : 'text-slate-700'}`}
                              >
                                {m.activeContract || 'None'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected machine (picked from the registry above) */}
              {formState.productId ? (
                (() => {
                  const editMachine = editingContract?.machine;
                  const regMachine = customerMachines.find((m) => m.id === formState.productId);
                  const prodMachine = products.find((p) => p.id === formState.productId);
                  const label = editMachine
                    ? `${editMachine.brand} ${editMachine.modelName} (S/N: ${editMachine.serialNumber})`
                    : regMachine
                      ? `${regMachine.modelName} (S/N: ${regMachine.serialNumber})`
                      : prodMachine
                        ? `${prodMachine.brand} ${prodMachine.name} (S/N: ${prodMachine.serial_no})`
                        : 'Selected machine';
                  return (
                    <div className="col-span-2 flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                      <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        {label}
                      </span>
                      {editingContract ? (
                        <span className="text-[10px] font-bold text-slate-400">
                          Machine cannot be changed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, productId: '' }))}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="col-span-2 p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                  Select a machine from the registry above, or register an external machine.
                </div>
              )}

              {/* METER READING CHECK — copies can expire a warranty before time does */}
              {needsMeterCheck && (
                <div className="col-span-2 p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
                    Verify Warranty — Current Meter Reading (Total Copies)
                  </label>
                  <p className="text-[11px] text-amber-700/80">
                    This machine has a copy-limited warranty. Ask the customer for the current meter
                    reading to confirm whether the warranty is really still active.
                  </p>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 85000"
                    value={meterReadingInput}
                    onChange={(e) => {
                      setMeterReadingInput(e.target.value);
                      // Customer-confirmed reading is the best contract baseline
                      if (e.target.value !== '') {
                        setFormState((prev) => ({ ...prev, startMeterReading: e.target.value }));
                      }
                    }}
                    className="h-9 text-xs bg-white border-amber-200 rounded-lg focus-visible:ring-amber-500 font-mono"
                  />
                  {checkingWarranty ? (
                    <p className="text-[11px] text-slate-400 animate-pulse">Checking warranty…</p>
                  ) : liveWarranty ? (
                    liveWarranty.isUnderWarranty ? (
                      <p className="text-[11px] font-semibold text-amber-800">
                        ⚠ Machine is STILL UNDER WARRANTY —{' '}
                        {formatWarranty(liveWarranty).text.replace('Active ', '')}. Service & parts
                        are already covered; a service contract is usually not needed yet.
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-emerald-700">
                        ✓ Warranty EXPIRED
                        {liveWarranty.expiredBy ? ` (limit hit: ${liveWarranty.expiredBy})` : ''}.
                        This machine is a valid candidate for a service contract.
                      </p>
                    )
                  ) : null}
                </div>
              )}

              {/* Contract Type */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Contract Type</label>
                <select
                  value={formState.contractType}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      contractType: e.target.value as ServiceContractType,
                    }))
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="FSMA">FSMA (Full Service — per click)</option>
                  <option value="SMA">SMA (Service Maintenance — copy limit)</option>
                  <option value="AMC">AMC (Annual Maintenance — monthly fee)</option>
                </select>
              </div>

              {/* Contract Value — FSMA has no upfront value, it's pure pay-per-click */}
              {formState.contractType === 'FSMA' ? (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Billing
                  </label>
                  <div className="h-10 flex items-center px-3 border border-slate-100 rounded-lg bg-slate-50 text-xs text-slate-500">
                    No upfront value
                  </div>
                  <p className="text-[10px] text-slate-400">
                    FSMA has no contract value — the entire charge comes from monthly per-click
                    meter readings, set below.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Contract Value ({getActiveCurrency()})<span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formState.contractValue}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        contractValue: Number(e.target.value) || 0,
                      }))
                    }
                    className="h-10 border-slate-200 focus-visible:ring-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-slate-400">
                    {formState.contractType === 'AMC'
                      ? 'Annual fee — invoiced in full at signing, collected as one or more installments.'
                      : 'Invoiced in full at signing. SMA copy-limit excess is billed separately, monthly.'}
                  </p>
                </div>
              )}

              {/* Plan summary + fixed coverage */}
              <div className="col-span-2 p-3 bg-blue-50/40 border border-blue-100 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-600">{PLAN_SUMMARY[formState.contractType]}</p>
                <div className="flex flex-wrap gap-2">
                  {COVERAGE_LABELS.map(({ key, label }) => {
                    const covered = COVERAGE_BY_TYPE[formState.contractType][key];
                    return (
                      <span
                        key={String(key)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          covered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {covered ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {label} {covered ? 'Free' : 'Charged'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Every contract is invoiced in full at signing; optional amount collected on the spot */}
              {!editingContract && (
                <div className="col-span-2 border border-slate-100 rounded-2xl p-4 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <DollarSign className="h-3.5 w-3.5" />
                    Payment Collected at Signing (optional)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    An invoice for the full contract value is raised automatically. If the customer
                    is paying now — in full or in part — record it here; it lands on that same
                    invoice. Leave blank to invoice as pending and collect later.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Amount Paid Now ({getActiveCurrency()})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={formState.contractValue || undefined}
                        value={initialPaymentForm.amount}
                        onChange={(e) =>
                          setInitialPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Payment Mode
                      </label>
                      <select
                        value={initialPaymentForm.paymentMode}
                        onChange={(e) =>
                          setInitialPaymentForm((prev) => ({
                            ...prev,
                            paymentMode: e.target.value as ContractInitialPayment['paymentMode'],
                          }))
                        }
                        className="h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                      </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Payment Date
                      </label>
                      <Input
                        type="date"
                        value={initialPaymentForm.paymentDate}
                        onChange={(e) =>
                          setInitialPaymentForm((prev) => ({
                            ...prev,
                            paymentDate: e.target.value,
                          }))
                        }
                        className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Reference Number
                      </label>
                      <Input
                        value={initialPaymentForm.referenceNumber}
                        onChange={(e) =>
                          setInitialPaymentForm((prev) => ({
                            ...prev,
                            referenceNumber: e.target.value,
                          }))
                        }
                        className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-emerald-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SMA — copy limit + baseline meter + overage rate */}
              {formState.contractType === 'SMA' && (
                <>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      Current Meter Reading (at signing) *
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={formState.startMeterReading}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, startMeterReading: e.target.value }))
                      }
                      className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                      placeholder="e.g. 85000"
                    />
                    <p className="text-[10px] text-slate-400">
                      Contract copies are counted from this baseline.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-600">Copy Limit *</label>
                    <Input
                      type="number"
                      min={1}
                      value={formState.copyLimit}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, copyLimit: e.target.value }))
                      }
                      className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                      placeholder="e.g. 100000"
                    />
                    <p className="text-[10px] text-slate-400">
                      Contract ends at 1 year or this many copies — whichever first.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-600">
                      Excess Rate per Copy ({getActiveCurrency()})
                    </label>
                    <Input
                      type="number"
                      step="0.0001"
                      min={0}
                      value={formState.overagePerCopyRate}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, overagePerCopyRate: e.target.value }))
                      }
                      className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                      placeholder="e.g. 0.05"
                    />
                    <p className="text-[10px] text-slate-400">
                      Charged per copy beyond the limit if the customer continues the SMA.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Monthly Base Fee ({getActiveCurrency()}) — optional
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formState.monthlyCharge}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, monthlyCharge: e.target.value }))
                      }
                      className="h-10 border-slate-200 focus-visible:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}

              {/* FSMA — per-click billing setup */}
              {formState.contractType === 'FSMA' && (
                <>
                  <div className="col-span-2 flex flex-col space-y-1">
                    <label className="text-xs font-bold text-slate-600">
                      Per-Click Billing Mode *
                    </label>
                    <div className="flex gap-2">
                      {(['COMBINED', 'INDIVIDUAL'] as FsmaBillingMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({ ...prev, fsmaBillingMode: mode }))
                          }
                          className={`flex-1 p-2.5 border rounded-xl text-left transition ${
                            formState.fsmaBillingMode === mode
                              ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="block text-xs font-bold text-slate-800">
                            {mode === 'COMBINED' ? 'Combined' : 'Individual'}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {mode === 'COMBINED'
                              ? 'One rate for every click (total meter)'
                              : 'Separate B&W and colour rates & meters'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formState.fsmaBillingMode === 'INDIVIDUAL' ? (
                    <>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600">
                          B&W Rate per Click ({getActiveCurrency()}) *
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={formState.ratePerClickBW}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, ratePerClickBW: e.target.value }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 0.03"
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600">
                          Colour Rate per Click ({getActiveCurrency()}) *
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={formState.ratePerClickColor}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, ratePerClickColor: e.target.value }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 0.15"
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Start Meter — B&W *
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={formState.startMeterBW}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, startMeterBW: e.target.value }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 60000"
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Start Meter — Colour *
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={formState.startMeterColor}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, startMeterColor: e.target.value }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 25000"
                        />
                      </div>
                      <div className="col-span-2 text-[11px] text-slate-500">
                        Total start meter:{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {(
                            (Number(formState.startMeterBW) || 0) +
                            (Number(formState.startMeterColor) || 0)
                          ).toLocaleString()}
                        </span>{' '}
                        (B&W + colour)
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600">
                          Rate per Click ({getActiveCurrency()}) *
                        </label>
                        <Input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={formState.ratePerClickCombined}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              ratePerClickCombined: e.target.value,
                            }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 0.06"
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          Start Meter — Total *
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={formState.startMeterReading}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, startMeterReading: e.target.value }))
                          }
                          className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                          placeholder="e.g. 85000"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Start Date */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={formState.endDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Status</label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>

              {/* Notes */}
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Notes</label>
                <Input
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                  placeholder="Special terms, agreed exclusions, PO reference..."
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm"
              >
                Save Contract
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meter Reading / Monthly Billing Dialog */}
      <Dialog
        open={!!billingContract}
        onOpenChange={(open) => {
          if (!open) setBillingContract(null);
        }}
      >
        <DialogContent className="max-w-2xl w-full p-0 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-emerald-600" />
              Meter Readings & Billing
              {billingContract && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {billingContract.contractType}
                  {billingContract.contractType === 'FSMA' &&
                    ` · ${billingContract.fsmaBillingMode === 'INDIVIDUAL' ? 'Individual' : 'Combined'}`}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {billingContract?.contractType === 'AMC' &&
                'AMC covers service visits & labour for the contract fee — meter readings here are optional, for tracking only, and are never charged.'}
              {billingContract?.contractType === 'SMA' &&
                'Enter the machine meter each month/visit. Copies beyond the contract limit are billed at the agreed per-copy rate.'}
              {billingContract?.contractType === 'FSMA' &&
                'Enter the meter each month — the amount to collect is computed from clicks used since the last reading.'}
            </DialogDescription>
          </DialogHeader>

          {billingContract && (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              {/* Contract billing parameters */}
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="block text-slate-400 font-semibold uppercase text-[9px]">
                    {billingContract.contractType === 'AMC'
                      ? 'Contract Value'
                      : billingContract.contractType === 'SMA'
                        ? 'Copy Limit'
                        : 'Rate'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {billingContract.contractType === 'AMC' &&
                      `${getActiveCurrency()} ${Number(billingContract.contractValue ?? 0).toFixed(2)}`}
                    {billingContract.contractType === 'SMA' &&
                      `${Number(billingContract.copyLimit ?? 0).toLocaleString()} copies`}
                    {billingContract.contractType === 'FSMA' &&
                      (billingContract.fsmaBillingMode === 'INDIVIDUAL'
                        ? `B&W ${Number(billingContract.ratePerClickBW ?? 0)} · Col ${Number(billingContract.ratePerClickColor ?? 0)}`
                        : `${getActiveCurrency()} ${Number(billingContract.ratePerClickCombined ?? 0)}/click`)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="block text-slate-400 font-semibold uppercase text-[9px]">
                    Last Reading
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {billingContract.contractType === 'FSMA' &&
                    billingContract.fsmaBillingMode === 'INDIVIDUAL'
                      ? `BW ${Number(lastReading?.bwReading ?? billingContract.startMeterBW ?? 0).toLocaleString()} · Col ${Number(lastReading?.colorReading ?? billingContract.startMeterColor ?? 0).toLocaleString()}`
                      : Number(
                          lastReading?.totalReading ?? billingContract.startMeterReading ?? 0,
                        ).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="block text-slate-400 font-semibold uppercase text-[9px]">
                    Billed to Date
                  </span>
                  <span className="font-bold text-emerald-700">
                    {getActiveCurrency()} {totalBilled.toFixed(2)}
                  </span>
                </div>
              </div>

              {billingContract.contractType === 'SMA' && (
                <p className="text-[11px] text-amber-700 bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
                  Toner is always chargeable under SMA. Service visits, labour and spare parts stay
                  free while the contract is within time and copy limit.
                </p>
              )}
              {billingContract.contractType === 'AMC' && (
                <p className="text-[11px] text-blue-700 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
                  AMC has no per-click or monthly meter billing — readings are optional and kept
                  only to track machine usage. Spare parts and toner are billed as used via service
                  tickets.
                </p>
              )}

              {/* Record new reading */}
              <form
                onSubmit={handleSaveReading}
                className="p-3 border border-slate-200 rounded-xl space-y-3 bg-slate-50/40"
              >
                <span className="text-xs font-bold text-slate-700 block">
                  Record{' '}
                  {billingContract.contractType === 'AMC'
                    ? 'Meter Reading (tracking only)'
                    : 'New Reading'}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {billingContract.contractType === 'FSMA' &&
                  billingContract.fsmaBillingMode === 'INDIVIDUAL' ? (
                    <>
                      <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          B&W Meter *
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={readingForm.bwReading}
                          onChange={(e) =>
                            setReadingForm((prev) => ({ ...prev, bwReading: e.target.value }))
                          }
                          className="h-9 text-xs bg-white font-mono"
                          placeholder="Current B&W meter"
                        />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Colour Meter *
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={readingForm.colorReading}
                          onChange={(e) =>
                            setReadingForm((prev) => ({ ...prev, colorReading: e.target.value }))
                          }
                          className="h-9 text-xs bg-white font-mono"
                          placeholder="Current colour meter"
                        />
                      </div>
                      <div className="col-span-2 text-[10px] text-slate-400">
                        Total meter:{' '}
                        <span className="font-mono font-semibold text-slate-600">
                          {(
                            (Number(readingForm.bwReading) || 0) +
                            (Number(readingForm.colorReading) || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : billingContract.contractType === 'AMC' ? (
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Total Meter (optional, for tracking)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={readingForm.totalReading}
                        onChange={(e) =>
                          setReadingForm((prev) => ({ ...prev, totalReading: e.target.value }))
                        }
                        className="h-9 text-xs bg-white font-mono"
                        placeholder="Current total meter"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Total Meter *
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={readingForm.totalReading}
                        onChange={(e) =>
                          setReadingForm((prev) => ({ ...prev, totalReading: e.target.value }))
                        }
                        className="h-9 text-xs bg-white font-mono"
                        placeholder="Current total meter"
                      />
                    </div>
                  )}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                    <Input
                      value={readingForm.notes}
                      onChange={(e) =>
                        setReadingForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="h-9 text-xs bg-white"
                      placeholder="e.g. July billing cycle"
                    />
                  </div>
                </div>

                {/* Live amount preview */}
                {readingPreview &&
                  ('error' in readingPreview && readingPreview.error ? (
                    <p className="text-[11px] font-semibold text-rose-600">
                      {readingPreview.error}
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-slate-700">
                      To collect this period:{' '}
                      <span className="text-emerald-700 font-bold">
                        {getActiveCurrency()} {(readingPreview.amount ?? 0).toFixed(2)}
                      </span>
                      {readingPreview.detail && (
                        <span className="text-slate-400 font-normal">
                          {' '}
                          — {readingPreview.detail}
                        </span>
                      )}
                    </p>
                  ))}

                <Button
                  type="submit"
                  disabled={savingReading}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm"
                >
                  {savingReading
                    ? 'Saving...'
                    : billingContract.contractType === 'AMC'
                      ? 'Save Reading'
                      : 'Save & Compute Charge'}
                </Button>
              </form>

              {/* History */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">Reading History</span>
                {loadingReadings ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Loading history...</p>
                ) : readings.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No readings recorded yet.
                  </p>
                ) : (
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold text-slate-500">
                            Date
                          </TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-500">
                            Meter
                          </TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                            Clicks
                          </TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-500 text-right">
                            Amount
                          </TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-500">
                            Notes
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readings.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-[11px] text-slate-600 py-2">
                              {new Date(r.readingDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-[11px] font-mono text-slate-600 py-2">
                              {billingContract.contractType === 'FSMA' &&
                              billingContract.fsmaBillingMode === 'INDIVIDUAL'
                                ? `BW ${Number(r.bwReading ?? 0).toLocaleString()} · Col ${Number(r.colorReading ?? 0).toLocaleString()}`
                                : r.totalReading != null
                                  ? Number(r.totalReading).toLocaleString()
                                  : '—'}
                            </TableCell>
                            <TableCell className="text-[11px] font-mono text-slate-600 py-2 text-right">
                              {billingContract.contractType === 'FSMA' &&
                              billingContract.fsmaBillingMode === 'INDIVIDUAL'
                                ? `${r.clicksBW.toLocaleString()} + ${r.clicksColor.toLocaleString()}`
                                : r.clicksTotal.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-[11px] font-bold text-emerald-700 py-2 text-right">
                              {getActiveCurrency()} {Number(r.amountCharged).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-400 py-2 truncate max-w-[120px]">
                              {r.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBillingContract(null)}
              className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* External Machine Registration Dialog */}
      <Dialog open={externalDialogOpen} onOpenChange={setExternalDialogOpen}>
        <DialogContent className="max-w-md w-full p-0 bg-white rounded-xl shadow-2xl border border-slate-200">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Register External Machine
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Machine bought elsewhere — saved to this customer so a service contract and tickets
              can be raised against it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveExternalMachine}>
            <div className="grid grid-cols-2 gap-4 px-6 py-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Brand *</label>
                <div className="flex gap-1.5 items-center">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      options={brands.map((b) => ({ value: b.name, label: b.name }))}
                      value={externalForm.brand}
                      onValueChange={(val) =>
                        setExternalForm((prev) => ({ ...prev, brand: val, modelName: '' }))
                      }
                      placeholder="Select brand..."
                      className="h-10 rounded-lg border-slate-200 bg-card text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setBrandError(null);
                      setShowCreateBrandModal(true);
                    }}
                    className="h-10 w-10 shrink-0 border-slate-200 rounded-lg bg-card hover:bg-slate-50 text-slate-500"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Model Name *</label>
                <div className="flex gap-1.5 items-center">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      options={models
                        .filter(
                          (m) =>
                            !externalForm.brand ||
                            m.brandRelation?.name?.toLowerCase() ===
                              externalForm.brand.toLowerCase(),
                        )
                        .map((m) => ({
                          value: m.model_name,
                          label: `${m.model_name} (${m.model_no})`,
                        }))}
                      value={externalForm.modelName}
                      onValueChange={(val) =>
                        setExternalForm((prev) => ({ ...prev, modelName: val }))
                      }
                      placeholder="Select model..."
                      className="h-10 rounded-lg border-slate-200 bg-card text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleOpenCreateModel}
                    className="h-10 w-10 shrink-0 border-slate-200 rounded-lg bg-card hover:bg-slate-50 text-slate-500"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Serial Number *</label>
                <Input
                  value={externalForm.serialNumber}
                  onChange={(e) =>
                    setExternalForm((prev) => ({ ...prev, serialNumber: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                  placeholder="e.g. CNX123456"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  Current Meter Reading *
                </label>
                <Input
                  type="number"
                  min={0}
                  value={externalForm.meterReading}
                  onChange={(e) =>
                    setExternalForm((prev) => ({ ...prev, meterReading: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-blue-500 font-mono"
                  placeholder="e.g. 85000"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Print Type</label>
                <select
                  value={externalForm.printColour}
                  onChange={(e) =>
                    setExternalForm((prev) => ({
                      ...prev,
                      printColour: e.target.value as 'BLACK_WHITE' | 'COLOUR' | 'BOTH',
                    }))
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="BLACK_WHITE">Black & White</option>
                  <option value="COLOUR">Colour</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Notes</label>
                <Input
                  value={externalForm.description}
                  onChange={(e) =>
                    setExternalForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-blue-500"
                  placeholder="Condition, accessories..."
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExternalDialogOpen(false)}
                className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingExternal}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm"
              >
                {savingExternal ? 'Saving...' : 'Register & Select'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE BRAND MODAL */}
      {showCreateBrandModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={16} /> Create Brand
              </CardTitle>
              <CardDescription className="text-xs">
                Add a new hardware brand to the repository list.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateBrand}>
              <CardContent className="p-5 space-y-3.5">
                {brandError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-start gap-2">
                    <span className="font-medium">{brandError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Xerox, HP, Canon"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="Short description of the brand"
                    value={brandForm.description}
                    onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateBrandModal(false);
                    setBrandForm({ name: '', description: '' });
                    setBrandError(null);
                  }}
                  className="rounded-xl h-8 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingBrandState}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-8 text-xs px-4"
                >
                  {creatingBrandState && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Create
                  Brand
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE MODEL MODAL */}
      {showCreateModelModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={16} /> Create Model
              </CardTitle>
              <CardDescription className="text-xs">
                Add a new model to the list and link it to a brand.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateModel}>
              <CardContent className="p-5 space-y-3.5">
                {modelError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-start gap-2">
                    <span className="font-medium">{modelError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                    value={modelForm.brand_id}
                    onValueChange={(val) => setModelForm({ ...modelForm, brand_id: val })}
                    placeholder="Select brand..."
                    className="h-9 w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Model Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. VersaLink C405"
                    value={modelForm.model_name}
                    onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Model Number / Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. C405-DX"
                    value={modelForm.model_no}
                    onChange={(e) => setModelForm({ ...modelForm, model_no: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="Short description of the model features"
                    value={modelForm.description}
                    onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModelModal(false);
                    setModelForm({ model_no: '', model_name: '', brand_id: '', description: '' });
                    setModelError(null);
                  }}
                  className="rounded-xl h-8 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingModelState}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-8 text-xs px-4"
                >
                  {creatingModelState && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Create
                  Model
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* AMC INSTALLMENT PAYMENT DIALOG */}
      <Dialog open={!!payingContract} onOpenChange={(open) => !open && setPayingContract(null)}>
        <DialogContent className="max-w-md w-full p-0 bg-white rounded-xl shadow-2xl border border-slate-200">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Record Payment
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Recorded against the same invoice raised at signing — an updated receipt reflecting
              this payment can be sent from the invoice.
            </DialogDescription>
          </DialogHeader>

          {payingContract?.invoiceId && contractPaymentSummaries[payingContract.invoiceId] && (
            <div className="mx-6 mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-500">
                Paid {getActiveCurrency()}{' '}
                {contractPaymentSummaries[payingContract.invoiceId].totalPaid.toFixed(2)} of{' '}
                {getActiveCurrency()}{' '}
                {contractPaymentSummaries[payingContract.invoiceId].totalAmount.toFixed(2)}
              </span>
              <span className="font-bold text-slate-700">
                Balance {getActiveCurrency()}{' '}
                {contractPaymentSummaries[payingContract.invoiceId].pendingBalance.toFixed(2)}
              </span>
            </div>
          )}

          <form onSubmit={handleRecordContractPayment}>
            <div className="grid grid-cols-2 gap-4 px-6 py-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">
                  Amount ({getActiveCurrency()}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={payingForm.amount}
                  onChange={(e) => setPayingForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Payment Mode *</label>
                <select
                  value={payingForm.paymentMode}
                  onChange={(e) =>
                    setPayingForm((prev) => ({
                      ...prev,
                      paymentMode: e.target.value as ContractInitialPayment['paymentMode'],
                    }))
                  }
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-card focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Payment Date *</label>
                <Input
                  type="date"
                  value={payingForm.paymentDate}
                  onChange={(e) =>
                    setPayingForm((prev) => ({ ...prev, paymentDate: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Reference Number</label>
                <Input
                  value={payingForm.referenceNumber}
                  onChange={(e) =>
                    setPayingForm((prev) => ({ ...prev, referenceNumber: e.target.value }))
                  }
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2 flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-600">Remarks</label>
                <Input
                  value={payingForm.remarks}
                  onChange={(e) => setPayingForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="h-10 border-slate-200 focus-visible:ring-green-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayingContract(null)}
                className="h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingPayment}
                className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-medium text-xs shadow-sm"
              >
                {savingPayment ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewingInvoice && (
        <InvoiceViewDialog invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
      )}

      <CustomerFormDialog
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        customer={null}
        onSubmit={handleCreateCustomer}
      />

      <ProductDetailModal
        productId={viewProductId}
        open={!!viewProductId}
        onClose={() => setViewProductId(null)}
        hideVendorDetails
        hideLotDetails={isServiceTechnician}
      />
    </div>
  );
}
