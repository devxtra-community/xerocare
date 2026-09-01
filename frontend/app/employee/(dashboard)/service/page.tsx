'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import { getBranches, Branch } from '@/lib/branch';
import { getCustomers, Customer, createCustomer } from '@/lib/customer';
import { getLeads, Lead, createLead } from '@/lib/lead';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getBrands, Brand } from '@/lib/brand';
import { getAllModels, addModel, Model, CreateModelData, UpdateModelData } from '@/lib/model';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ArrivalDiagnosisDialog } from '@/components/ui/ArrivalDiagnosisDialog';
import { Modal } from '@/components/ui/Modal';
import { DetailDialog } from '@/components/ui/DetailDialog';
import { useToast } from '@/components/ui/ToastProvider';
import SendDocumentModal from '@/components/SendDocumentModal';
import { AddBrandDialog } from '@/components/ManagerDashboardComponents/BrandComponents/AddBrandDialog';
import { ModelFormModal } from '@/components/ManagerDashboardComponents/productComponents/ModelFormModal';
import { Play, UserPlus, Send } from 'lucide-react';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import {
  getServiceTickets,
  createServiceTicket,
  assignTechnician,
  diagnoseServiceTicket,
  submitServiceQuotation,
  approveServiceQuotation,
  rejectServiceQuotation,
  completeServiceTicket,
  cancelServiceTicket,
  getTechnicians,
  getCustomerServiceHistory,
  ServiceTicket,
  ServiceTechnicianInfo,
  CustomerServiceHistory,
  startDiagnosis,
  startRepair,
  pauseRepair,
  resumeRepair,
  getTicketEstimates,
  createServiceEstimate,
  submitEstimateForApproval,
  approveEstimateFinance,
  rejectEstimateFinance,
  approveEstimateCustomer,
  rejectEstimateCustomer,
  createEstimateRevision,
  approveRevisionFinance,
  approveRevisionCustomer,
  reviseServiceEstimate,
  getEstimateRevisions,
  extendTicketValidity,
  ServiceEstimate,
  ServiceEstimateRevision,
  ServiceEstimateItem,
  getMachineHistory,
  downloadServiceReport,
  MachineHistoryResponse,
  ServiceTicketItem,
  ConsumableYieldHistory,
  WarrantyInfo,
  fetchServiceCashBankAccounts,
} from '@/lib/serviceTicket';
import { ServiceContract, getServiceContracts } from '@/lib/serviceContract';
import {
  getStatusColor,
  ServiceTicketHistoryPanel,
  BillingHistoryPanel,
} from '@/components/employeeComponents/CustomerHistoryPanels';
import {
  MachineAllocation,
  getRentedMachines as getRentedMachinesShared,
  getLeasedMachines as getLeasedMachinesShared,
  getPurchasedMachines as getPurchasedMachinesShared,
  getExternalMachines as getExternalMachinesShared,
  getContractMachines as getContractMachinesShared,
} from '@/lib/machineAllocations';

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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Plus,
  Wrench,
  History,
  Search,
  DollarSign,
  Calendar,
  User,
  Mail,
  Phone,
  Laptop,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  Eye,
  Calculator,
  Pencil,
  Pause,
  Trash2,
  Package,
  Info,
} from 'lucide-react';

import { getActiveCurrency } from '@/lib/currency';
interface AuthUser {
  userId: string;
  role: string;
  employeeJob?: string;
  branchId?: string;
}

// Local-timezone YYYY-MM-DD, for <input type="date"> min and validation.
const todayLocalISO = () => new Date().toLocaleDateString('en-CA');

function formatElapsed(diffMs: number): string {
  const diff = Math.max(0, diffMs);
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hrs > 0 ? `${hrs}:` : ''}${pad(mins)}:${pad(secs)}`;
}

function ActiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const update = () => setElapsed(formatElapsed(Date.now() - start));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-md font-mono text-[11px] font-bold shadow-sm animate-pulse">
      <span className="w-2 h-2 rounded-full bg-red-500 block"></span>
      <span>{elapsed}</span>
    </div>
  );
}

/** Frozen elapsed-so-far display while a repair is paused — no ticking. */
function PausedTimer({
  startTime,
  pausedAt,
  pausedDurationMinutes,
}: {
  startTime: string;
  pausedAt: string;
  pausedDurationMinutes?: number;
}) {
  const start = new Date(startTime).getTime();
  const paused = new Date(pausedAt).getTime();
  const elapsedMs = paused - start - (pausedDurationMinutes || 0) * 60000;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-md font-mono text-[11px] font-bold shadow-sm">
      <span className="w-2 h-2 rounded-full bg-amber-500 block"></span>
      <span>Paused · {formatElapsed(elapsedMs)}</span>
    </div>
  );
}

interface VisitLog {
  ticketNumber: string;
  serviceContext: string;
  status: string;
  date: string;
  meterReading: number;
  cost: number;
}

interface MachineLifetimeCostUI {
  totalServiceVisits: number;
  totalSparePartsCost: number;
  totalLabourCost: number;
  totalLifetimeCost: number;
  currentMeterReading: number | null;
  visitLogs: VisitLog[];
}

interface ConsumableYieldUI {
  id: string;
  consumableSku: string;
  actualYield: number;
  targetYield: number;
}

export default function ServiceDashboardPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [technicians, setTechnicians] = useState<ServiceTechnicianInfo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [leads, setLeads] = useState<Lead[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals & States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDiagnoseModal, setShowDiagnoseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showIntelModal, setShowIntelModal] = useState(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareDocType, setShareDocType] = useState<'quotation' | 'completion-bill'>('quotation');
  const [shareTicket, setShareTicket] = useState<ServiceTicket | null>(null);

  // New states for ERP service workflow
  const [showEstimatesModal, setShowEstimatesModal] = useState(false);
  const [estimatesData, setEstimatesData] = useState<{
    estimates: ServiceEstimate[];
    revisions: ServiceEstimateRevision[];
  } | null>(null);
  const [newEstLabour, setNewEstLabour] = useState<number>(0);
  const [newEstItems, setNewEstItems] = useState<Partial<ServiceEstimateItem>[]>([]);
  // const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [newRevLabour, setNewRevLabour] = useState<number>(0);
  const [newRevItems, setNewRevItems] = useState<Partial<ServiceEstimateItem>[]>([]);
  const [ticketRevisions, setTicketRevisions] = useState<ServiceEstimateRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'revisions'>('info');

  const [showMachineIntelModal, setShowMachineIntelModal] = useState(false);
  const [selectedMachineSerial, setSelectedMachineSerial] = useState('');
  const [machineCostData, setMachineCostData] = useState<MachineLifetimeCostUI | null>(null);
  const [machineYieldData, setMachineYieldData] = useState<ConsumableYieldUI[]>([]);
  const [machinePartLogs, setMachinePartLogs] = useState<MachineHistoryResponse['partLogs']>([]);
  const [activeIntelTab, setActiveIntelTab] = useState<'visits' | 'parts' | 'yields'>('visits');
  const [loadingMachineIntel, setLoadingMachineIntel] = useState(false);

  const [completeForm, setCompleteForm] = useState({
    workPerformed: '',
    resolutionDetails: '',
    meterReading: 0,
    customerRemarks: '',
    technicianRemarks: '',
    customerSignature: 'Customer Signed',
    technicianSignature: 'Technician Signed',
  });

  // Arrival guard before the diagnosis timer starts (two-step confirm)
  const [arrivalDialog, setArrivalDialog] = useState<{
    ticketId: string;
    ticketNo?: string;
    location?: string | null;
  } | null>(null);
  const [startingDiagnosis, setStartingDiagnosis] = useState(false);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: React.ReactNode;
    type: 'destructive' | 'positive' | 'neutral';
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Reject-with-visit-charge-collection modal state
  const [rejectVCModal, setRejectVCModal] = useState<
    | { kind: 'quotation'; ticketId: string; amount: number; eligible: boolean }
    | { kind: 'estimate'; estimateId: string; amount: number; eligible: boolean }
    | null
  >(null);
  const [rejectCollect, setRejectCollect] = useState(true);
  const [rejectPaymentMode, setRejectPaymentMode] = useState('');
  const [rejectAccountId, setRejectAccountId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDiscountAmount, setRejectDiscountAmount] = useState('');
  const isVisitChargeCollectionEligible = (t: ServiceTicket) =>
    t.serviceContext === 'CHARGEABLE' &&
    Number(t.visitChargeAmount || 0) > 0 &&
    t.visitChargeMethod === 'ADDED_TO_ESTIMATE' &&
    !t.visitChargeCollected;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [associatedLeadName, setAssociatedLeadName] = useState('');
  const [leadForm, setLeadForm] = useState({
    name: '',
    location: '',
    email: '',
    phone: '',
  });
  const [creatingLead, setCreatingLead] = useState(false);

  // Brand/Model states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);

  // Form states
  const [newTicket, setNewTicket] = useState({
    customerId: '',
    leadId: '',
    productId: '',
    productBrand: '',
    productModel: '',
    productName: '',
    serialNumber: '',
    serviceContext: 'CHARGEABLE',
    contractReferenceId: '',
    issueDescription: '',
    jobType: 'ONSITE',
    scheduledVisitDate: '',
    serviceLocation: '',
  });

  const [creationPath, setCreationPath] = useState<'existing' | 'new'>('existing');
  const [activeMachineTab, setActiveMachineTab] = useState<
    'rented' | 'leased' | 'purchased' | 'contract' | 'external'
  >('rented');
  const [selectedMachine, setSelectedMachine] = useState<MachineAllocation | null>(null);
  const [machineContextLoading, setMachineContextLoading] = useState(false);
  const [meterReadingInput, setMeterReadingInput] = useState('');
  const [machineContextData, setMachineContextData] = useState<{
    serviceContext: string;
    contractReferenceId: string | null;
    productId: string | null;
    coverage: {
      labour: boolean;
      spareParts: boolean;
      toner: boolean;
      travel: boolean;
    };
    contract: ServiceContract | null;
    warrantyInfo?: WarrantyInfo | null;
    contractUsage?: {
      copiesUsed: number;
      copyLimit: number;
      copiesRemaining: number;
      limitExceeded: boolean;
      overagePerCopyRate: number;
    } | null;
  } | null>(null);

  useEffect(() => {
    if (!selectedMachine?.serialNumber) {
      setMachineContextData(null);
      return;
    }
    // Debounced so typing a meter reading re-evaluates coverage live
    // without firing a request per keystroke.
    const serial = selectedMachine.serialNumber;
    const reading = meterReadingInput !== '' ? Number(meterReadingInput) : undefined;
    setMachineContextLoading(true);
    const timer = setTimeout(() => {
      import('@/lib/serviceTicket').then(({ getMachineContext }) => {
        getMachineContext(serial, reading)
          .then((res) => {
            setMachineContextData(res);
            setNewTicket((prev) => ({
              ...prev,
              serviceContext: res.serviceContext,
              contractReferenceId: res.contractReferenceId || '',
            }));
          })
          .catch((err) => {
            console.error('Error fetching machine context:', err);
            setMachineContextData(null);
          })
          .finally(() => {
            setMachineContextLoading(false);
          });
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedMachine?.serialNumber, meterReadingInput]);

  // A fresh machine selection invalidates any previously typed reading.
  useEffect(() => {
    setMeterReadingInput('');
  }, [selectedMachine?.serialNumber]);

  const [isOtherMachine, setIsOtherMachine] = useState(false);
  const [modalIntelData, setModalIntelData] = useState<CustomerServiceHistory | null>(null);
  const [loadingModalIntel, setLoadingModalIntel] = useState(false);
  // Live AMC/SMA/FSMA contracts for the selected customer; billing history
  // doesn't include them, so external/purchased machines would otherwise
  // show no contract coverage in the machine registry.
  const [customerActiveContracts, setCustomerActiveContracts] = useState<ServiceContract[]>([]);

  const [cashBankAccounts, setCashBankAccounts] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const loadCashBankAccounts = async (branchId: string | undefined) => {
    if (!branchId) return;
    try {
      setCashBankAccounts(await fetchServiceCashBankAccounts(branchId));
    } catch (err) {
      console.error('Failed to load cash/bank accounts:', err);
    }
  };

  const [assignForm, setAssignForm] = useState({
    technicianId: '',
  });

  const [diagnosisForm, setDiagnosisForm] = useState<{
    notes: string;
    problemFound: string;
    rootCause: string;
    meterReading: number;
    labourCost: number;
    visitChargeAmount: number;
    visitChargeMethod: 'ADDED_TO_ESTIMATE' | 'SEPARATE';
    visitChargeCollected: boolean;
    visitChargePaymentMode: string;
    visitChargeAccountId: string;
    transportChargeAmount: number;
    discountAmount: number;
    technicianNoteToFinance: string;
    items: Array<{
      itemSource: 'SPARE_PART' | 'CUSTOM';
      sparePartId: string;
      customPartName: string;
      customPartBrand: string;
      customPartDescription: string;
      mpn: string;
      partName: string;
      quantity: number;
      unitPrice: number;
      isFree: boolean;
    }>;
  }>({
    notes: '',
    problemFound: '',
    rootCause: '',
    meterReading: 0,
    labourCost: 0,
    visitChargeAmount: 0,
    visitChargeMethod: 'ADDED_TO_ESTIMATE',
    visitChargeCollected: true,
    visitChargePaymentMode: '',
    visitChargeAccountId: '',
    transportChargeAmount: 0,
    discountAmount: 0,
    technicianNoteToFinance: '',
    items: [],
  });

  const [quoteForm, setQuoteForm] = useState({
    laborCost: 0,
    visitChargeAmount: 0,
    visitChargeMethod: 'ADDED_TO_ESTIMATE' as 'ADDED_TO_ESTIMATE' | 'SEPARATE',
    discountAmount: 0,
    technicianNoteToFinance: '',
  });

  const [completionNotes, setCompletionNotes] = useState('');

  // Intel view states
  const [selectedIntelCustomer, setSelectedIntelCustomer] = useState<string>('');
  const [intelData, setIntelData] = useState<CustomerServiceHistory | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // General Filter/Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [branches, setBranches] = useState<Branch[]>([]);
  const branchFilterMounted = useRef(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const ticketsList = await getServiceTickets();
      setTickets(ticketsList);

      // Fetch technicians, customers, leads, parts, brands, models
      const [techs, custs, lds, parts, brandsRes, modelsRes] = await Promise.all([
        getTechnicians().catch(() => []),
        getCustomers().catch(() => []),
        getLeads().catch(() => []),
        getAllSpareParts().catch(() => []),
        getBrands().catch(() => ({ success: false, data: [] })),
        getAllModels().catch(() => ({ data: [] })),
      ]);

      setTechnicians(techs);
      setCustomers(custs);
      setLeads(lds);
      setSpareParts(parts);
      setBrands(brandsRes.success ? brandsRes.data : []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error('Failed to load initial service management data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getUserFromToken() as AuthUser;
    setUser(currentUser);
    if (currentUser?.role === 'ADMIN') {
      getBranches()
        .then((res) => setBranches(res?.data || []))
        .catch(() => {});
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!branchFilterMounted.current) {
      branchFilterMounted.current = true;
      return;
    }
    const currentUser = getUserFromToken() as AuthUser;
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    const loadTickets = async () => {
      try {
        setLoading(true);
        const ticketsList = await getServiceTickets(
          selectedBranch !== 'ALL' ? selectedBranch : undefined,
        );
        setTickets(ticketsList);
      } catch (err) {
        console.error('Failed to load tickets for branch:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, [selectedBranch]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creationPath === 'existing') {
      if (!newTicket.customerId) {
        toast.error('Please select a customer.');
        return;
      }
      if (!selectedMachine && !isOtherMachine) {
        toast.error('Please select a machine or select "Other Machine".');
        return;
      }
      if (isOtherMachine) {
        if (
          !newTicket.productBrand.trim() ||
          !newTicket.productModel.trim() ||
          !newTicket.productName.trim()
        ) {
          toast.error('Please fill out Product Brand, Model, and Name.');
          return;
        }
      }
      if (!newTicket.issueDescription.trim()) {
        toast.error('Issue description is required.');
        return;
      }
      if (newTicket.jobType === 'ONSITE' && !newTicket.scheduledVisitDate) {
        toast.error('Scheduled Visit Date is required for On-Site service.');
        return;
      }
      if (newTicket.jobType === 'ONSITE' && newTicket.scheduledVisitDate < todayLocalISO()) {
        toast.error('Scheduled Visit Date cannot be in the past.');
        return;
      }
      // Copy-limited warranties need the customer's meter reading to decide
      // whether the warranty is still valid.
      if (
        !isOtherMachine &&
        selectedMachine &&
        (selectedMachine.type === 'SALE' || selectedMachine.type === 'LEASE') &&
        machineContextData?.warrantyInfo?.copyLimit != null &&
        meterReadingInput === ''
      ) {
        toast.error(
          'Please ask the customer for the current meter reading — this machine has a copy-limited warranty.',
        );
        return;
      }

      try {
        setSubmitting(true);
        const payload: Partial<ServiceTicket> = {
          customerId: newTicket.customerId,
          productId: isOtherMachine ? undefined : newTicket.productId || undefined,
          productBrand: isOtherMachine
            ? newTicket.productBrand.trim()
            : newTicket.productBrand || undefined,
          productModel: isOtherMachine
            ? newTicket.productModel.trim()
            : newTicket.productModel || undefined,
          productName: isOtherMachine
            ? newTicket.productName.trim()
            : newTicket.productName || undefined,
          serialNumber: newTicket.serialNumber ? newTicket.serialNumber.trim() : undefined,
          serviceContext: isOtherMachine ? 'CHARGEABLE' : newTicket.serviceContext,
          contractReferenceId: isOtherMachine
            ? undefined
            : newTicket.contractReferenceId || undefined,
          jobType: newTicket.jobType,
          scheduledVisitDate:
            newTicket.jobType === 'ONSITE' ? newTicket.scheduledVisitDate : undefined,
          serviceLocation:
            newTicket.jobType === 'ONSITE'
              ? newTicket.serviceLocation.trim() || undefined
              : undefined,
          issueDescription: newTicket.issueDescription.trim(),
          meterReadingAtCreation:
            !isOtherMachine && meterReadingInput !== '' ? Number(meterReadingInput) : undefined,
        };

        await createServiceTicket(payload);
        toast.success('Service ticket created successfully!');
        setShowCreateModal(false);
        resetTicketForm();
        await fetchInitialData();
      } catch (error) {
        console.error('Failed to create ticket:', error);
        toast.error('Error creating service ticket. Please verify inputs and connection.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // New Customer Flow — anyone we service becomes a customer, not a lead.
      if (!leadForm.name.trim() || !leadForm.phone.trim() || !leadForm.location.trim()) {
        toast.error('Customer Name, Phone, and Location are required.');
        return;
      }
      if (
        !newTicket.productBrand.trim() ||
        !newTicket.productModel.trim() ||
        !newTicket.productName.trim()
      ) {
        toast.error('Product Brand, Model, and Name are required.');
        return;
      }
      if (!newTicket.issueDescription.trim()) {
        toast.error('Issue description is required.');
        return;
      }
      if (newTicket.jobType === 'ONSITE' && !newTicket.scheduledVisitDate) {
        toast.error('Scheduled Visit Date is required for On-Site service.');
        return;
      }
      if (newTicket.jobType === 'ONSITE' && newTicket.scheduledVisitDate < todayLocalISO()) {
        toast.error('Scheduled Visit Date cannot be in the past.');
        return;
      }

      try {
        setSubmitting(true);
        // Step 1: Create the Customer — a service ticket means they're being
        // serviced, which makes them a customer, not a CRM lead.
        const created = await createCustomer({
          name: leadForm.name.trim(),
          city: leadForm.location.trim(),
          email: leadForm.email.trim() || undefined,
          phone: leadForm.phone.trim(),
        });
        const customerId = created.id;

        // Step 2: Create ticket with customerId
        const payload: Partial<ServiceTicket> = {
          customerId,
          productBrand: newTicket.productBrand.trim(),
          productModel: newTicket.productModel.trim(),
          productName: newTicket.productName.trim(),
          serialNumber: newTicket.serialNumber.trim() || undefined,
          serviceContext: 'CHARGEABLE',
          jobType: newTicket.jobType,
          scheduledVisitDate:
            newTicket.jobType === 'ONSITE' ? newTicket.scheduledVisitDate : undefined,
          serviceLocation:
            newTicket.jobType === 'ONSITE'
              ? newTicket.serviceLocation.trim() || leadForm.location.trim() || undefined
              : undefined,
          issueDescription: newTicket.issueDescription.trim(),
        };

        await createServiceTicket(payload);
        toast.success('Customer and service ticket created successfully!');
        setShowCreateModal(false);
        resetTicketForm();
        await fetchInitialData();
      } catch (error) {
        console.error('Failed to create customer/ticket:', error);
        toast.error('Error creating customer or service ticket.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      toastError('Lead Name is required');
      return;
    }
    try {
      setCreatingLead(true);
      const created = await createLead({
        name: leadForm.name.trim(),
        location: leadForm.location.trim() || undefined,
        email: leadForm.email.trim() || undefined,
        phone: leadForm.phone.trim() || undefined,
        status: 'new',
      });
      setNewTicket((prev) => ({
        ...prev,
        leadId: created._id,
        customerId: '', // Clear customer selection
      }));
      setAssociatedLeadName(created.name || 'New Lead');
      setShowCreateLeadModal(false);
      // Reset form
      setLeadForm({ name: '', location: '', email: '', phone: '' });
      // Refresh leads list
      const lds = await getLeads().catch(() => []);
      setLeads(lds);
    } catch (error) {
      console.error('Failed to create lead:', error);
      toastError('Failed to create lead. Please check the inputs.');
    } finally {
      setCreatingLead(false);
    }
  };

  // Brand/model creation now delegates to the exact dialogs used on the
  // Brand and Model management pages (AddBrandDialog / ModelFormModal).
  // Those own their own fields, validation, and persistence — here we just
  // refresh the local lists and, since the ticket form benefits from it,
  // carry the newly created brand/model straight into the ticket fields.
  const handleBrandCreated = async () => {
    const prevNames = new Set(brands.map((b) => b.name));
    const resBrands = await getBrands().catch(() => ({ success: false, data: [] }));
    const brandList = resBrands.success ? resBrands.data : [];
    setBrands(brandList);

    const created = brandList.find((b: Brand) => !prevNames.has(b.name));
    if (created) {
      setNewTicket((prev) => ({ ...prev, productBrand: created.name }));
    }
  };

  const handleOpenCreateModel = () => {
    setShowCreateModelModal(true);
  };

  const handleModelCreated = async (data: CreateModelData | UpdateModelData) => {
    try {
      const created = await addModel(data as CreateModelData);
      const resModels = await getAllModels().catch(() => ({ data: [] }));
      setModels(resModels.data || []);

      setNewTicket((prev) => ({
        ...prev,
        productModel: created.model_no,
        productName: created.model_name,
      }));

      setShowCreateModelModal(false);
      toastSuccess('Model created successfully!');
    } catch (error) {
      console.error('Failed to create model:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message || 'Failed to create model. Please try again.');
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    const isReassignment = !!selectedTicket.assignedTechnicianId;
    try {
      setSubmitting(true);
      await assignTechnician(
        selectedTicket.id,
        assignForm.technicianId,
        selectedTicket.scheduledVisitDate || undefined,
      );
      setShowAssignModal(false);
      setAssignForm({ technicianId: '' });
      toastSuccess(
        isReassignment
          ? 'Technician changed. The new technician will get target credit once this job is completed.'
          : 'Technician assigned successfully!',
      );
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to assign technician:', error);
      toastError('Failed to assign technician.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDiagnosis = async (ticketId: string) => {
    try {
      setLoading(true);
      await startDiagnosis(ticketId);
      await fetchInitialData();
      toastSuccess('Diagnosis phase started successfully!');
    } catch (error) {
      console.error('Failed to start diagnosis:', error);
      toastError('Failed to start diagnosis.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRepair = async (ticketId: string) => {
    try {
      setLoading(true);
      await startRepair(ticketId);
      await fetchInitialData();
      toastSuccess('Repair phase started successfully!');
    } catch (error) {
      console.error('Failed to start repair:', error);
      toastError('Failed to start repair.');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseRepair = async (ticketId: string) => {
    try {
      setLoading(true);
      await pauseRepair(ticketId);
      await fetchInitialData();
      toastSuccess('Repair paused.');
    } catch (error) {
      console.error('Failed to pause repair:', error);
      toastError('Failed to pause repair.');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeRepair = async (ticketId: string) => {
    try {
      setLoading(true);
      await resumeRepair(ticketId);
      await fetchInitialData();
      toastSuccess('Repair resumed.');
    } catch (error) {
      console.error('Failed to resume repair:', error);
      toastError('Failed to resume repair.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnose = async (e?: React.FormEvent, confirmed = false) => {
    e?.preventDefault();
    if (!selectedTicket) return;

    // Discount applies to the whole estimate: parts + labour + transport +
    // visit charge (when added to the estimate). It cannot exceed that total.
    const partsTotal = diagnosisForm.items.reduce(
      (sum, item) => sum + (item.isFree ? 0 : (item.quantity || 1) * (item.unitPrice || 0)),
      0,
    );
    const estimateTotalBeforeDiscount =
      partsTotal +
      (Number(diagnosisForm.labourCost) || 0) +
      (Number(diagnosisForm.transportChargeAmount) || 0) +
      (diagnosisForm.visitChargeMethod === 'ADDED_TO_ESTIMATE'
        ? Number(diagnosisForm.visitChargeAmount) || 0
        : 0);
    if (Number(diagnosisForm.discountAmount || 0) > estimateTotalBeforeDiscount) {
      toast.error(
        `Discount of ${getActiveCurrency()} ${diagnosisForm.discountAmount} exceeds the total estimate amount of ${getActiveCurrency()} ${estimateTotalBeforeDiscount.toFixed(2)}.`,
      );
      return;
    }

    // Require Technician Note to Finance if status is REVISED/rejected or revisionCount > 0
    const isRevision =
      selectedTicket.status === 'REVISED' ||
      selectedTicket.status === 'FINANCE_REJECTED' ||
      (selectedTicket.additionalEstimateCount && selectedTicket.additionalEstimateCount > 0);
    if (isRevision && !diagnosisForm.technicianNoteToFinance?.trim()) {
      toast.error('Technician note to finance is required explaining the reason for revision.');
      return;
    }

    const isSeparateVisitChargeCollection =
      diagnosisForm.visitChargeMethod === 'SEPARATE' &&
      Number(diagnosisForm.visitChargeAmount) > 0 &&
      diagnosisForm.visitChargeCollected;
    if (
      isSeparateVisitChargeCollection &&
      (!diagnosisForm.visitChargePaymentMode ||
        (diagnosisForm.visitChargePaymentMode !== 'CHEQUE' && !diagnosisForm.visitChargeAccountId))
    ) {
      toast.error('Select a payment mode and account before posting the visit charge to accounts.');
      return;
    }

    // Final guard so an accidental tap on Submit can't lock in the estimate.
    if (!confirmed) {
      setConfirmConfig({
        title: isRevision ? 'Submit estimate revision?' : 'Finish diagnosis?',
        description: isRevision
          ? 'Submit this revised estimate for approval. You cannot edit it again once submitted.'
          : 'Confirm the diagnosis is complete and submit the estimate for approval. You cannot edit it again once submitted.',
        type: 'positive',
        confirmText: isRevision ? 'Submit Revision' : 'Finish & Submit',
        onConfirm: () => handleDiagnose(undefined, true),
      });
      setConfirmOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      if (isRevision) {
        await reviseServiceEstimate(selectedTicket.id, {
          items: diagnosisForm.items.map((it) => ({
            itemSource: it.itemSource,
            sparePartId: it.sparePartId || undefined,
            customPartName: it.customPartName || undefined,
            customPartBrand: it.customPartBrand || undefined,
            customPartDescription: it.customPartDescription || undefined,
            mpn: it.mpn || undefined,
            partName: it.partName,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            isFree: !!it.isFree,
          })),
          visitChargeAmount: Number(diagnosisForm.visitChargeAmount) || 0,
          visitChargeMethod: diagnosisForm.visitChargeMethod,
          discountAmount: Number(diagnosisForm.discountAmount) || 0,
          technicianNoteToFinance: diagnosisForm.technicianNoteToFinance,
          revisionType: 'REVISION',
        });
        toastSuccess('Estimate revision submitted successfully!');
      } else {
        await diagnoseServiceTicket(selectedTicket.id, {
          problemFound: diagnosisForm.problemFound || 'General breakdown',
          rootCause: diagnosisForm.rootCause || 'Undetermined root cause',
          technicianNotes: diagnosisForm.notes,
          meterReading: Number(diagnosisForm.meterReading) || 0,
          labourCost: Number(diagnosisForm.labourCost) || 0,
          visitChargeAmount: Number(diagnosisForm.visitChargeAmount) || 0,
          visitChargeMethod: diagnosisForm.visitChargeMethod,
          visitChargeCollected:
            diagnosisForm.visitChargeMethod === 'SEPARATE'
              ? diagnosisForm.visitChargeCollected
              : false,
          visitChargePaymentMode: isSeparateVisitChargeCollection
            ? diagnosisForm.visitChargePaymentMode
            : undefined,
          visitChargeAccountId: isSeparateVisitChargeCollection
            ? diagnosisForm.visitChargeAccountId
            : undefined,
          transportChargeAmount: Number(diagnosisForm.transportChargeAmount) || 0,
          discountAmount: Number(diagnosisForm.discountAmount) || 0,
          technicianNoteToFinance: diagnosisForm.technicianNoteToFinance || null,
          items: diagnosisForm.items.map((it) => ({
            itemSource: it.itemSource,
            sparePartId: it.sparePartId || undefined,
            customPartName: it.customPartName || undefined,
            customPartBrand: it.customPartBrand || undefined,
            customPartDescription: it.customPartDescription || undefined,
            mpn: it.mpn || undefined,
            partName: it.partName,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            isFree: !!it.isFree,
          })),
        });
        toastSuccess('Diagnosis and estimate submitted successfully!');
      }
      setShowDiagnoseModal(false);
      setDiagnosisForm({
        notes: '',
        problemFound: '',
        rootCause: '',
        meterReading: 0,
        labourCost: 0,
        visitChargeAmount: 0,
        visitChargeMethod: 'ADDED_TO_ESTIMATE',
        visitChargeCollected: true,
        visitChargePaymentMode: '',
        visitChargeAccountId: '',
        transportChargeAmount: 0,
        discountAmount: 0,
        technicianNoteToFinance: '',
        items: [],
      });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to submit:', error);
      toastError('Failed to submit. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await submitServiceQuotation(selectedTicket.id, quoteForm);
      setShowQuoteModal(false);
      setQuoteForm({
        laborCost: 0,
        visitChargeAmount: 0,
        visitChargeMethod: 'ADDED_TO_ESTIMATE',
        discountAmount: 0,
        technicianNoteToFinance: '',
      });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to submit quote:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // const handleStartService = async (ticketId: string) => {
  //   try {
  //     setLoading(true);
  //     await startServiceTicket(ticketId);
  //     await fetchInitialData();
  //     toastSuccess('Service job started successfully!');
  //   } catch (error) {
  //     console.error('Failed to start ticket:', error);
  //     toastError('Failed to start service job.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleStartServiceClick = (ticketId: string, ticketNo?: string) => {
  //   setConfirmConfig({
  //     title: 'Start Service Job',
  //     description: `You are about to begin work on ticket ${ticketNo || ticketId}. This will notify the customer and update the ticket status to In Progress.`,
  //     type: 'positive',
  //     confirmText: 'Start Work',
  //     onConfirm: () => handleStartService(ticketId),
  //   });
  //   setConfirmOpen(true);
  // };

  const handleCompleteService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await completeServiceTicket(selectedTicket.id, {
        workPerformed: completeForm.workPerformed || 'Standard service repair',
        resolutionDetails: completeForm.resolutionDetails || completionNotes,
        meterReading: Number(completeForm.meterReading) || 0,
        customerRemarks: completeForm.customerRemarks || undefined,
        technicianRemarks: completeForm.technicianRemarks || undefined,
        customerSignature: completeForm.customerSignature || 'Customer Signed',
        technicianSignature: completeForm.technicianSignature || 'Technician Signed',
      });
      setShowCompleteModal(false);
      setCompleteForm({
        workPerformed: '',
        resolutionDetails: '',
        meterReading: 0,
        customerRemarks: '',
        technicianRemarks: '',
        customerSignature: 'Customer Signed',
        technicianSignature: 'Technician Signed',
      });
      setCompletionNotes('');
      await fetchInitialData();
      toastSuccess('Service job completed successfully!');
    } catch (error) {
      console.error('Failed to complete ticket:', error);
      toastError('Failed to complete service job.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchEstimates = async (ticketId: string) => {
    try {
      const data = await getTicketEstimates(ticketId);
      setEstimatesData(data);
    } catch (err) {
      console.error('Failed to fetch estimates:', err);
    }
  };

  const fetchTicketRevisions = async (ticketId: string) => {
    try {
      setLoadingRevisions(true);
      const data = await getEstimateRevisions(ticketId);
      setTicketRevisions((data as ServiceEstimateRevision[]) || []);
    } catch (err) {
      console.error('Failed to fetch revisions:', err);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleOpenEstimates = async (ticket: ServiceTicket) => {
    if (isHelpDesk) {
      toastError('Help Desk does not have authority to manage estimates.');
      return;
    }
    setSelectedTicket(ticket);
    await fetchEstimates(ticket.id);
    setNewEstLabour(0);
    setNewEstItems([]);
    // setShowRevisionForm(false);
    setNewRevLabour(0);
    setNewRevItems([]);
    setShowEstimatesModal(true);
  };

  const fetchMachineIntel = async (serial: string, productId?: string) => {
    try {
      setLoadingMachineIntel(true);
      const data = await getMachineHistory(productId || serial);

      const mappedCost: MachineLifetimeCostUI = {
        totalServiceVisits: data.history?.totalServiceVisits || data.tickets.length,
        totalSparePartsCost: Number(data.history?.totalPartsSpend) || 0,
        totalLabourCost: Number(data.history?.totalLabourSpend) || 0,
        totalLifetimeCost: Number(data.history?.totalLifetimeCost) || 0,
        currentMeterReading: data.currentMeterReading ?? null,
        visitLogs: (data.tickets || []).map((t: ServiceTicket) => {
          let ticketCost = 0;
          t.items?.forEach((item: ServiceTicketItem) => {
            ticketCost += Number(item.totalPrice) || 0;
          });
          return {
            ticketNumber: t.ticketNumber,
            serviceContext: t.serviceContext,
            status: t.status,
            date: t.completedAt || t.created_at,
            meterReading: t.meterReadingAtService || t.meterReadingAtCreation || 0,
            cost: ticketCost,
          };
        }),
      };

      const mappedYields: ConsumableYieldUI[] = (data.yields || []).map(
        (y: ConsumableYieldHistory) => ({
          id: y.id,
          consumableSku: y.tonerSku,
          actualYield: y.yieldPages || 0,
          targetYield: 10000,
        }),
      );

      setMachineCostData(mappedCost);
      setMachineYieldData(mappedYields);
      setMachinePartLogs(data.partLogs || []);
    } catch (err) {
      console.error('Failed to load machine intel:', err);
      toastError('Failed to load machine intel data');
    } finally {
      setLoadingMachineIntel(false);
    }
  };

  const handleOpenMachineIntel = async (serial: string, productId?: string) => {
    setSelectedMachineSerial(serial);
    setMachineCostData(null);
    setMachineYieldData([]);
    setMachinePartLogs([]);
    setActiveIntelTab('visits');
    setShowMachineIntelModal(true);
    await fetchMachineIntel(serial, productId);
  };

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await createServiceEstimate(selectedTicket.id, newEstLabour, newEstItems);
      await fetchEstimates(selectedTicket.id);
      setNewEstLabour(0);
      setNewEstItems([]);
      toastSuccess('Draft estimate created!');
    } catch (err) {
      console.error(err);
      toastError('Failed to create estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEstimate = async (ticketId: string) => {
    try {
      setSubmitting(true);
      await submitEstimateForApproval(ticketId);
      await fetchEstimates(ticketId);
      await fetchInitialData();
      toastSuccess('Estimate submitted for internal approval.');
    } catch (err) {
      console.error(err);
      toastError('Failed to submit estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveFinance = async (estimateId: string) => {
    try {
      setSubmitting(true);
      await approveEstimateFinance(estimateId);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess('Finance approved the estimate!');
    } catch (err) {
      console.error(err);
      toastError('Failed to approve estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectFinance = async (estimateId: string, remarks?: string) => {
    try {
      setSubmitting(true);
      await rejectEstimateFinance(estimateId, remarks);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess('Finance rejected the estimate.');
    } catch (err) {
      console.error(err);
      toastError('Failed to reject estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveCustomer = async (estimateId: string) => {
    try {
      setSubmitting(true);
      await approveEstimateCustomer(estimateId);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess('Customer approved the estimate!');
    } catch (err) {
      console.error(err);
      toastError('Failed to approve estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectCustomer = async (
    estimateId: string,
    body: {
      collectVisitCharge?: boolean;
      paymentMode?: string;
      accountId?: string;
      reason: string;
      discountAmount?: number;
    },
  ) => {
    try {
      setSubmitting(true);
      await rejectEstimateCustomer(estimateId, body);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess(
        body.discountAmount
          ? `Discount of ${body.discountAmount} offered instead of rejection.`
          : 'Customer rejected the estimate.',
      );
    } catch (err) {
      console.error(err);
      toastError('Failed to reject estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await createEstimateRevision(selectedTicket.id, newRevLabour, newRevItems);
      await fetchEstimates(selectedTicket.id);
      setNewRevLabour(0);
      setNewRevItems([]);
      // setShowRevisionForm(false);
      toastSuccess('Estimate revision created successfully!');
    } catch (err) {
      console.error(err);
      toastError('Failed to create revision.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRevisionFinance = async (revisionId: string) => {
    try {
      setSubmitting(true);
      await approveRevisionFinance(revisionId);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess('Finance approved the revision!');
    } catch (err) {
      console.error(err);
      toastError('Failed to approve revision.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRevisionCustomer = async (revisionId: string) => {
    try {
      setSubmitting(true);
      await approveRevisionCustomer(revisionId);
      if (selectedTicket) await fetchEstimates(selectedTicket.id);
      await fetchInitialData();
      toastSuccess('Customer approved the revision!');
    } catch (err) {
      console.error(err);
      toastError('Failed to approve revision.');
    } finally {
      setSubmitting(false);
    }
  };

  const addEstimateItem = () => {
    setNewEstItems((prev) => [
      ...prev,
      {
        itemSource: 'SPARE_PART',
        sparePartId: '',
        customPartName: '',
        customPartBrand: '',
        customPartDescription: '',
        partName: '',
        quantity: 1,
        unitPrice: 0,
        isFree: false,
      },
    ]);
  };

  const updateEstimateItem = (index: number, key: string, value: string | number | boolean) => {
    const updated = [...newEstItems];
    if (key === 'sparePartId') {
      const part = spareParts.find((p) => p.id === value);
      if (part) {
        updated[index] = {
          ...updated[index],
          sparePartId: value as string,
          partName: part.part_name,
          unitPrice: Number(part.base_price) || 0,
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [key]: value as never,
      };
    }
    setNewEstItems(updated);
  };

  const removeEstimateItem = (index: number) => {
    setNewEstItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addRevisionItem = () => {
    setNewRevItems((prev) => [
      ...prev,
      {
        itemSource: 'SPARE_PART',
        sparePartId: '',
        customPartName: '',
        customPartBrand: '',
        customPartDescription: '',
        partName: '',
        quantity: 1,
        unitPrice: 0,
        isFree: false,
      },
    ]);
  };

  const updateRevisionItem = (index: number, key: string, value: string | number | boolean) => {
    const updated = [...newRevItems];
    if (key === 'sparePartId') {
      const part = spareParts.find((p) => p.id === value);
      if (part) {
        updated[index] = {
          ...updated[index],
          sparePartId: value as string,
          partName: part.part_name,
          unitPrice: Number(part.base_price) || 0,
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [key]: value as never,
      };
    }
    setNewRevItems(updated);
  };

  const removeRevisionItem = (index: number) => {
    setNewRevItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancelTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      await cancelServiceTicket(ticketId);
      await fetchInitialData();
      toastSuccess('Service ticket cancelled successfully!');
    } catch (error) {
      console.error('Failed to cancel ticket:', error);
      toastError('Failed to cancel service ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicketClick = (ticketId: string, ticketNo?: string) => {
    setConfirmConfig({
      title: 'Cancel Service Ticket',
      description: `Are you sure you want to cancel ticket ${ticketNo || ticketId}? This action cannot be undone.`,
      type: 'destructive',
      confirmText: 'Cancel Ticket',
      onConfirm: () => handleCancelTicket(ticketId),
    });
    setConfirmOpen(true);
  };

  const handleApproveQuotation = async (ticketId: string) => {
    try {
      setLoading(true);
      await approveServiceQuotation(ticketId);
      toastSuccess('Customer approval recorded.');
      await fetchInitialData();
    } catch (error: unknown) {
      console.error('Failed to approve:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message || 'Failed to record customer approval. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectQuotation = async (
    ticketId: string,
    body: {
      collectVisitCharge?: boolean;
      paymentMode?: string;
      accountId?: string;
      reason: string;
      discountAmount?: number;
    },
  ) => {
    try {
      setLoading(true);
      await rejectServiceQuotation(ticketId, body);
      await fetchInitialData();
      toastSuccess(
        body.discountAmount
          ? `Discount of ${body.discountAmount} offered instead of rejection.`
          : 'Customer rejected the quotation.',
      );
    } catch (error) {
      console.error('Failed to reject:', error);
      toastError('Failed to reject quotation.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerIntel = async (customerId: string) => {
    if (!customerId) return;
    try {
      setLoadingIntel(true);
      const data = await getCustomerServiceHistory(customerId);
      setIntelData(data);
    } catch (error) {
      console.error('Failed to load customer intelligence history:', error);
    } finally {
      setLoadingIntel(false);
    }
  };

  const loadModalCustomerIntel = async (customerId: string) => {
    if (!customerId) {
      setModalIntelData(null);
      setCustomerActiveContracts([]);
      return;
    }
    try {
      setLoadingModalIntel(true);
      const [data, contracts] = await Promise.all([
        getCustomerServiceHistory(customerId),
        getServiceContracts({ customerId, status: 'ACTIVE' }).catch(() => [] as ServiceContract[]),
      ]);
      setModalIntelData(data);
      setCustomerActiveContracts(contracts);
    } catch (error) {
      console.error('Failed to load modal customer intelligence history:', error);
      toast.error('Failed to load customer machine history');
    } finally {
      setLoadingModalIntel(false);
    }
  };

  const resetTicketForm = () => {
    setNewTicket({
      customerId: '',
      leadId: '',
      productId: '',
      productBrand: '',
      productModel: '',
      productName: '',
      serialNumber: '',
      serviceContext: 'CHARGEABLE',
      contractReferenceId: '',
      issueDescription: '',
      jobType: 'ONSITE',
      scheduledVisitDate: '',
      serviceLocation: '',
    });
    setLeadForm({
      name: '',
      location: '',
      email: '',
      phone: '',
    });
    setSelectedMachine(null);
    setIsOtherMachine(false);
    setModalIntelData(null);
    setCustomerActiveContracts([]);
    setCreationPath('existing');
    setActiveMachineTab('rented');
    setMeterReadingInput('');
  };

  const getRentedMachines = (): MachineAllocation[] =>
    getRentedMachinesShared(modalIntelData, models);
  const getLeasedMachines = (): MachineAllocation[] =>
    getLeasedMachinesShared(modalIntelData, models);
  const getPurchasedMachines = (): MachineAllocation[] =>
    getPurchasedMachinesShared(modalIntelData, models);
  const getExternalMachines = (): MachineAllocation[] =>
    getExternalMachinesShared(modalIntelData, customerActiveContracts);
  const getContractMachines = (): MachineAllocation[] =>
    getContractMachinesShared(modalIntelData, models);

  const addDiagnosisItem = () => {
    setDiagnosisForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemSource: 'SPARE_PART',
          sparePartId: '',
          customPartName: '',
          customPartBrand: '',
          customPartDescription: '',
          mpn: '',
          partName: '',
          quantity: 1,
          unitPrice: 0,
          isFree: false,
        },
      ],
    }));
  };

  const updateDiagnosisItem = (index: number, key: string, value: string | number | boolean) => {
    setDiagnosisForm((prev) => {
      const updated = [...prev.items];
      if (key === 'sparePartId') {
        const part = spareParts.find((p) => p.id === value);
        if (part) {
          updated[index] = {
            ...updated[index],
            sparePartId: value as string,
            partName: part.part_name,
            unitPrice: Number(part.base_price) || 0,
          };
        }
      } else if (key === 'itemSource' && value === 'CUSTOM') {
        // A custom part is for the machine on this ticket, so seed Brand and
        // Model Name from the ticket's product details. Only fill blanks —
        // never clobber what the technician already typed.
        updated[index] = {
          ...updated[index],
          itemSource: 'CUSTOM',
          customPartBrand: updated[index].customPartBrand || selectedTicket?.productBrand || '',
          customPartDescription:
            updated[index].customPartDescription ||
            selectedTicket?.productModel ||
            selectedTicket?.productName ||
            '',
        };
      } else {
        updated[index] = {
          ...updated[index],
          [key]: value,
        } as unknown as (typeof updated)[0];
      }
      return { ...prev, items: updated };
    });
  };

  const removeDiagnosisItem = (index: number) => {
    setDiagnosisForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.productName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesBranch = selectedBranch === 'ALL' || ticket.branchId === selectedBranch;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  const formatMachineName = (brand?: string, model?: string, name?: string) => {
    const parts: string[] = [];
    if (brand) parts.push(brand.trim());
    if (model) parts.push(model.trim());
    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== model?.trim().toLowerCase()) {
        parts.push(trimmedName);
      }
    }
    return parts.filter(Boolean).join(' - ') || 'Device';
  };

  const isHelpDesk = user?.employeeJob === 'SERVICE_HELP_DESK';
  const isTechnician = user?.employeeJob === 'SERVICE_TECHNICIAN';
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const canManageFinance = user?.role === 'FINANCE' || isManagerOrAdmin;
  const rejectHasDiscount = Number(rejectDiscountAmount) > 0;

  return (
    <div className="bg-slate-50 min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wrench className="text-primary h-6 w-6" /> Service Management Module
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Logged in as:{' '}
            <span className="font-bold text-slate-700">
              {user?.employeeJob || user?.role || 'Service Representative'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons based on jobs — manager has full authority in the branch */}
          {(isHelpDesk || isManagerOrAdmin) && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-sm gap-2"
            >
              <Plus size={16} /> Create Service Ticket
            </Button>
          )}

          <Button
            onClick={() => {
              setShowIntelModal(true);
              setIntelData(null);
              setSelectedIntelCustomer('');
            }}
            variant="outline"
            className="border-slate-200 hover:bg-slate-100 rounded-xl shadow-none font-bold gap-2 text-slate-700"
          >
            <History size={16} /> Customer Intel History
          </Button>

          <Button
            onClick={fetchInitialData}
            variant="ghost"
            className="rounded-xl text-xs text-slate-500 font-bold"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main List */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Service Tickets</CardTitle>
            <CardDescription className="text-xs">
              Manage active customer breakdown, lease maintenance, and installation requests.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search ticket #, serial, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
              />
            </div>

            {/* Branch Filter — ADMIN only */}
            {user?.role === 'ADMIN' && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-9 text-xs border border-slate-200 bg-slate-50 rounded-xl px-3 outline-none focus:border-primary text-slate-600 font-medium"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs border border-slate-200 bg-slate-50 rounded-xl px-3 outline-none focus:border-primary text-slate-600 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="FREE_SERVICE">Free Service</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DIAGNOSED">Diagnosed</option>
              <option value="WAITING_FINANCE_APPROVAL">Waiting Finance Approval</option>
              <option value="FINANCE_APPROVED">Finance Approved</option>
              <option value="FINANCE_REJECTED">Finance Rejected</option>
              <option value="QUOTED">Quote Sent</option>
              <option value="CUSTOMER_APPROVED">Customer Approved</option>
              <option value="CUSTOMER_REJECTED">Customer Rejected</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ADDITIONAL_ESTIMATE_PENDING">Additional Estimate Pending</option>
              <option value="WAITING_FINANCE_APPROVAL_2">Add. Work — Waiting Finance</option>
              <option value="FINANCE_APPROVED_2">Add. Work Approved</option>
              <option value="ESTIMATE_RECORDED">Estimate Recorded</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <span className="text-xs text-slate-400 mt-2 block font-medium">
                Loading service tickets...
              </span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              No service tickets found matching your selection.
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Ticket No
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Brand / Model
                  </TableHead>
                  {user?.role === 'ADMIN' && (
                    <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                      Branch
                    </TableHead>
                  )}
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Context
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Job Type
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Visit Date
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 px-4 py-3">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                          setShowDetailsModal(true);
                        }}
                        className="hover:underline text-blue-600 hover:text-blue-800 font-bold focus:outline-none"
                      >
                        {ticket.ticketNumber}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-700 max-w-[260px] truncate">
                        {formatMachineName(
                          ticket.productBrand,
                          ticket.productModel,
                          ticket.productName,
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ticket.serialNumber) {
                              handleOpenMachineIntel(ticket.serialNumber);
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-mono font-bold hover:underline focus:outline-none"
                        >
                          SN: {ticket.serialNumber || 'N/A'}
                        </button>
                      </div>
                    </TableCell>
                    {user?.role === 'ADMIN' && (
                      <TableCell className="px-4 py-3 text-xs text-slate-600 font-medium">
                        {ticket.branchName || '—'}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3">
                      <Badge context={ticket.serviceContext} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500 font-medium">
                      {ticket.jobType}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-slate-500 font-medium">
                      {ticket.scheduledVisitDate
                        ? new Date(ticket.scheduledVisitDate).toLocaleDateString()
                        : 'Unscheduled'}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge status={ticket.status} />
                        {ticket.status === 'COMPLETED' && (
                          <button
                            title="Share Completion Bill"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareTicket(ticket);
                              setShareDocType('completion-bill');
                              setShareModalOpen(true);
                            }}
                          >
                            <Send className="size-3.5" />
                          </button>
                        )}
                        {(ticket.status === 'QUOTED' || ticket.status === 'CUSTOMER_APPROVED') && (
                          <button
                            title="Share Service Quotation"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareTicket(ticket);
                              setShareDocType('quotation');
                              setShareModalOpen(true);
                            }}
                          >
                            <FileText className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className="px-4 py-3 actions-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* HELP DESK / MANAGER ACTIONS — technician can be assigned or
                                changed any time before the job is done or cancelled (e.g. the
                                original technician becomes unavailable mid-flow). Whoever ends
                                up assigned when the ticket completes gets the target credit. */}
                          {(isHelpDesk || isManagerOrAdmin) &&
                            !['COMPLETED', 'CANCELLED'].includes(ticket.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-200 text-slate-600 hover:bg-slate-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setAssignForm({
                                    technicianId: ticket.assignedTechnicianId || '',
                                  });
                                  setShowAssignModal(true);
                                }}
                              >
                                <UserPlus className="size-3.5" />
                                {ticket.assignedTechnicianId ? 'Change Tech' : 'Assign Tech'}
                              </Button>
                            )}

                          {(isHelpDesk || isTechnician || isManagerOrAdmin) &&
                            (ticket.status === 'FINANCE_APPROVED' ||
                              ticket.status === 'QUOTED') && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => handleApproveQuotation(ticket.id)}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => {
                                    const eligible = isVisitChargeCollectionEligible(ticket);
                                    setRejectCollect(eligible);
                                    setRejectPaymentMode('');
                                    setRejectAccountId('');
                                    setRejectReason('');
                                    setRejectDiscountAmount('');
                                    if (eligible) loadCashBankAccounts(ticket.branchId);
                                    setRejectVCModal({
                                      kind: 'quotation',
                                      ticketId: ticket.id,
                                      amount: Number(ticket.visitChargeAmount) || 0,
                                      eligible,
                                    });
                                  }}
                                >
                                  <XCircle className="size-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}

                          {/* TECHNICIAN / MANAGER ACTIONS — manager may diagnose
                              before assignment; assigned technician after */}
                          {((isTechnician && ticket.status === 'ASSIGNED') ||
                            (isManagerOrAdmin &&
                              (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED'))) &&
                            !ticket.diagnosisStartedAt && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() =>
                                  setArrivalDialog({
                                    ticketId: ticket.id,
                                    ticketNo: ticket.ticketNumber,
                                    location: ticket.serviceLocation,
                                  })
                                }
                              >
                                <Play className="size-3.5 fill-current" />
                                Diagnose
                              </Button>
                            )}

                          {(isTechnician || isManagerOrAdmin) &&
                            (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') &&
                            ticket.diagnosisStartedAt &&
                            ticket.diagnosisStartedBy &&
                            ticket.diagnosisStartedBy !== user?.userId && (
                              <span
                                className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md select-none"
                                title="Diagnosis was started by another user"
                              >
                                Opened by{' '}
                                {ticket.diagnosisStartedBy === ticket.assignedTechnicianId
                                  ? 'Technician'
                                  : 'Manager'}
                              </span>
                            )}

                          {(isTechnician || isManagerOrAdmin) &&
                            (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') &&
                            ticket.diagnosisStartedAt && (
                              <div className="flex items-center gap-1">
                                <ActiveTimer startTime={ticket.diagnosisStartedAt.toString()} />
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    loadCashBankAccounts(ticket.branchId);
                                    setDiagnosisForm({
                                      notes: '',
                                      problemFound: '',
                                      rootCause: '',
                                      meterReading: 0,
                                      labourCost: 0,
                                      visitChargeAmount: 0,
                                      visitChargeMethod: 'ADDED_TO_ESTIMATE',
                                      visitChargeCollected: true,
                                      visitChargePaymentMode: '',
                                      visitChargeAccountId: '',
                                      transportChargeAmount: 0,
                                      discountAmount: 0,
                                      technicianNoteToFinance: '',
                                      items: [],
                                    });
                                    setShowDiagnoseModal(true);
                                  }}
                                >
                                  Diagnose
                                </Button>
                              </div>
                            )}

                          {/* ESTIMATE WORKFLOW FOR ALL PARTIES */}
                          {!isHelpDesk &&
                            (ticket.status === 'DIAGNOSED' ||
                              ticket.status === 'WAITING_FINANCE_APPROVAL' ||
                              ticket.status === 'FINANCE_APPROVED' ||
                              ticket.status === 'FINANCE_REJECTED' ||
                              ticket.status === 'CUSTOMER_APPROVED' ||
                              ticket.status === 'CUSTOMER_REJECTED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() => handleOpenEstimates(ticket)}
                              >
                                <Calculator className="size-3.5" />
                                Estimates
                              </Button>
                            )}

                          {(isTechnician || isManagerOrAdmin) &&
                            (ticket.status === 'FINANCE_REJECTED' ||
                              ticket.status === 'REVISED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-200 text-amber-600 hover:bg-amber-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  loadCashBankAccounts(ticket.branchId);
                                  const laborItem = ticket.items?.find(
                                    (it) => it.partName === 'Labor Cost / Service Charge',
                                  );
                                  const otherItems =
                                    ticket.items?.filter(
                                      (it) => it.partName !== 'Labor Cost / Service Charge',
                                    ) || [];
                                  setDiagnosisForm({
                                    notes: ticket.diagnosisNotes || '',
                                    problemFound: ticket.problemFound || '',
                                    rootCause: ticket.rootCause || '',
                                    meterReading: ticket.meterReadingAtService || 0,
                                    labourCost: laborItem ? Number(laborItem.unitPrice) : 0,
                                    visitChargeAmount: ticket.visitChargeAmount || 0,
                                    visitChargeMethod:
                                      (ticket.visitChargeMethod as
                                        | 'ADDED_TO_ESTIMATE'
                                        | 'SEPARATE') || 'ADDED_TO_ESTIMATE',
                                    visitChargeCollected: !!ticket.visitChargeCollected,
                                    visitChargePaymentMode: '',
                                    visitChargeAccountId: '',
                                    transportChargeAmount: ticket.transportChargeAmount || 0,
                                    discountAmount: ticket.discountAmount || 0,
                                    technicianNoteToFinance: ticket.technicianNoteToFinance || '',
                                    items: otherItems.map((it) => ({
                                      itemSource: it.itemSource,
                                      sparePartId: it.sparePartId || '',
                                      customPartName: it.customPartName || '',
                                      customPartBrand: it.customPartBrand || '',
                                      customPartDescription: it.customPartDescription || '',
                                      mpn: it.mpn || '',
                                      partName: it.partName || '',
                                      quantity: it.quantity || 1,
                                      unitPrice: it.unitPrice || 0,
                                      isFree: !!it.isFree,
                                    })),
                                  });
                                  setShowDiagnoseModal(true);
                                }}
                              >
                                <Pencil className="size-3.5" />
                                Revise Estimate
                              </Button>
                            )}

                          {((isTechnician && ticket.assignedTechnicianId === user?.userId) ||
                            isManagerOrAdmin) &&
                            (ticket.status === 'CUSTOMER_APPROVED' ||
                              ticket.status === 'FREE_SERVICE') &&
                            !ticket.repairStartedAt && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() => handleStartRepair(ticket.id)}
                              >
                                <Play className="size-3.5 fill-current" />
                                Repair
                              </Button>
                            )}

                          {(isTechnician || isManagerOrAdmin) &&
                            ticket.status === 'IN_PROGRESS' &&
                            ticket.repairStartedAt &&
                            !ticket.repairPausedAt && (
                              <div className="flex items-center gap-1">
                                <ActiveTimer startTime={ticket.repairStartedAt.toString()} />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-200 text-amber-600 hover:bg-amber-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => handlePauseRepair(ticket.id)}
                                >
                                  <Pause className="size-3.5" />
                                  Pause
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setCompleteForm({
                                      workPerformed: '',
                                      resolutionDetails: '',
                                      meterReading: 0,
                                      customerRemarks: '',
                                      technicianRemarks: '',
                                      customerSignature: 'Customer Signed',
                                      technicianSignature: 'Technician Signed',
                                    });
                                    setCompletionNotes('');
                                    setShowCompleteModal(true);
                                  }}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Complete
                                </Button>
                              </div>
                            )}

                          {(isTechnician || isManagerOrAdmin) &&
                            ticket.status === 'IN_PROGRESS' &&
                            ticket.repairStartedAt &&
                            ticket.repairPausedAt && (
                              <div className="flex items-center gap-1">
                                <PausedTimer
                                  startTime={ticket.repairStartedAt.toString()}
                                  pausedAt={ticket.repairPausedAt.toString()}
                                  pausedDurationMinutes={ticket.repairPausedDurationMinutes}
                                />
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                  onClick={() => handleResumeRepair(ticket.id)}
                                >
                                  <Play className="size-3.5 fill-current" />
                                  Resume
                                </Button>
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* MANAGER/ADMIN ACTIONS */}
                          {isManagerOrAdmin &&
                            ticket.status !== 'COMPLETED' &&
                            ticket.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                                onClick={() =>
                                  handleCancelTicketClick(ticket.id, ticket.ticketNumber)
                                }
                              >
                                <Ban className="size-3.5" />
                                Cancel
                              </Button>
                            )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-500 hover:bg-slate-100 h-7 px-2 rounded-md text-[11px] font-medium gap-1"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="size-3.5" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-primary" size={18} /> Create Service Ticket
              </CardTitle>
              <CardDescription className="text-xs">
                Select between existing customer machine registry or onboarding a new lead.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateTicket}>
              <CardContent className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Switcher tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition ${
                      creationPath === 'existing'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => {
                      setCreationPath('existing');
                      setSelectedMachine(null);
                      setIsOtherMachine(false);
                      setNewTicket((prev) => ({
                        ...prev,
                        customerId: '',
                        leadId: '',
                        productId: '',
                        productBrand: '',
                        productModel: '',
                        productName: '',
                        serialNumber: '',
                        serviceContext: 'CHARGEABLE',
                        contractReferenceId: '',
                      }));
                    }}
                  >
                    Existing Customer Flow
                  </button>
                  <button
                    type="button"
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition ${
                      creationPath === 'new'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => {
                      setCreationPath('new');
                      setSelectedMachine(null);
                      setIsOtherMachine(false);
                      setNewTicket((prev) => ({
                        ...prev,
                        customerId: '',
                        leadId: '',
                        productId: '',
                        productBrand: '',
                        productModel: '',
                        productName: '',
                        serialNumber: '',
                        serviceContext: 'CHARGEABLE',
                        contractReferenceId: '',
                      }));
                    }}
                  >
                    New Customer Flow
                  </button>
                </div>

                {/* PATH 1: EXISTING CUSTOMER FLOW */}
                {creationPath === 'existing' && (
                  <div className="space-y-4">
                    {/* Customer Selection */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Select Customer (Name or ID)
                      </label>
                      <SearchableSelect
                        options={customers.map((c) => ({
                          value: c.id,
                          label: `${c.name} (${c.id.substring(0, 8)})`,
                          description: c.email || c.phone || undefined,
                        }))}
                        value={newTicket.customerId}
                        onValueChange={(val) => {
                          setNewTicket((prev) => ({
                            ...prev,
                            customerId: val,
                            leadId: '',
                            productId: '',
                            productBrand: '',
                            productModel: '',
                            productName: '',
                            serialNumber: '',
                            contractReferenceId: '',
                          }));
                          setSelectedMachine(null);
                          setIsOtherMachine(false);
                          loadModalCustomerIntel(val);
                        }}
                        placeholder="Search customer by name or ID..."
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                      />
                    </div>

                    {/* Step 2: Machine Selection (appears after customer loads) */}
                    {loadingModalIntel && (
                      <div className="flex flex-col items-center justify-center py-8 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-slate-500 font-medium">
                          Fetching customer product history...
                        </p>
                      </div>
                    )}

                    {newTicket.customerId && !loadingModalIntel && (
                      <div className="space-y-3">
                        {!isOtherMachine ? (
                          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-xs font-bold text-slate-700">Select Machine</h4>
                              {selectedMachine && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                    Selected: {selectedMachine.serialNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMachine(null);
                                      setNewTicket((prev) => ({
                                        ...prev,
                                        productId: '',
                                        contractReferenceId: '',
                                        productBrand: '',
                                        productModel: '',
                                        productName: '',
                                        serialNumber: '',
                                        serviceContext: 'CHARGEABLE',
                                      }));
                                    }}
                                    className="text-[10px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 px-2 py-0.5 rounded-full transition cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-1">
                              <button
                                type="button"
                                onClick={() => setActiveMachineTab('rented')}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                                  activeMachineTab === 'rented'
                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                Rented ({getRentedMachines().length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveMachineTab('leased')}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                                  activeMachineTab === 'leased'
                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                Leased ({getLeasedMachines().length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveMachineTab('purchased')}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                                  activeMachineTab === 'purchased'
                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                Purchased ({getPurchasedMachines().length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveMachineTab('external')}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                                  activeMachineTab === 'external'
                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                External ({getExternalMachines().length})
                              </button>
                              {getContractMachines().length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveMachineTab('contract')}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                                    activeMachineTab === 'contract'
                                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                      : 'text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  Contracts ({getContractMachines().length})
                                </button>
                              )}
                            </div>

                            {/* Tab Contents */}
                            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                              {activeMachineTab === 'rented' && (
                                <>
                                  {getRentedMachines().length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-3 text-center">
                                      No rented machines found.
                                    </p>
                                  ) : (
                                    getRentedMachines().map((machine, index) => (
                                      <div
                                        key={machine.id + '-' + machine.serialNumber + '-' + index}
                                        onClick={() => {
                                          setSelectedMachine(machine);
                                          setNewTicket((prev) => ({
                                            ...prev,
                                            productId: machine.id,
                                            contractReferenceId: machine.contractReferenceId || '',
                                            productBrand: 'Xerox',
                                            productModel: machine.modelName,
                                            productName: machine.modelName,
                                            serialNumber: machine.serialNumber,
                                            serviceContext: 'RENT',
                                            jobType: 'ONSITE',
                                          }));
                                        }}
                                        className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 ${
                                          selectedMachine?.serialNumber === machine.serialNumber
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="font-bold text-slate-800">
                                            {machine.modelName}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              machine.contractStatus === 'ACTIVE'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {machine.contractStatus}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                          <div>
                                            Serial:{' '}
                                            <span className="font-mono text-slate-700 font-semibold">
                                              {machine.serialNumber}
                                            </span>
                                          </div>
                                          <div>
                                            Rent:{' '}
                                            <span className="font-bold text-slate-700">
                                              QR {machine.monthlyRent}
                                            </span>
                                          </div>
                                          <div className="col-span-2">
                                            Period:{' '}
                                            <span className="font-semibold text-slate-600">
                                              {machine.effectiveFrom} → {machine.effectiveTo}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}

                              {activeMachineTab === 'leased' && (
                                <>
                                  {getLeasedMachines().length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-3 text-center">
                                      No leased machines found.
                                    </p>
                                  ) : (
                                    getLeasedMachines().map((machine, index) => (
                                      <div
                                        key={machine.id + '-' + machine.serialNumber + '-' + index}
                                        onClick={() => {
                                          setSelectedMachine(machine);
                                          setNewTicket((prev) => ({
                                            ...prev,
                                            productId: machine.id,
                                            contractReferenceId: machine.contractReferenceId || '',
                                            productBrand: 'Xerox',
                                            productModel: machine.modelName,
                                            productName: machine.modelName,
                                            serialNumber: machine.serialNumber,
                                            serviceContext: machine.isUnderWarranty
                                              ? 'LEASE_UNDER_WARRANTY'
                                              : 'LEASE_EXPIRED',
                                            jobType: 'ONSITE',
                                          }));
                                        }}
                                        className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 ${
                                          selectedMachine?.serialNumber === machine.serialNumber
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="font-bold text-slate-800">
                                            {machine.modelName}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              machine.isUnderWarranty
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {machine.isUnderWarranty
                                              ? 'Under Warranty'
                                              : 'Warranty Expired'}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                          <div>
                                            Serial:{' '}
                                            <span className="font-mono text-slate-700 font-semibold">
                                              {machine.serialNumber}
                                            </span>
                                          </div>
                                          <div>
                                            Start:{' '}
                                            <span className="font-semibold text-slate-700">
                                              {machine.effectiveFrom}
                                            </span>
                                          </div>
                                          {machine.isUnderWarranty ? (
                                            <>
                                              <div>
                                                Remaining Time:{' '}
                                                <span className="text-emerald-700 font-bold">
                                                  {machine.remainingTime}
                                                </span>
                                              </div>
                                              <div>
                                                Remaining Copies:{' '}
                                                <span className="text-emerald-700 font-bold">
                                                  {machine.remainingCopies}
                                                </span>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="col-span-2">
                                              Expired First:{' '}
                                              <span className="text-red-700 font-bold">
                                                {machine.expiredFirst}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}

                              {activeMachineTab === 'purchased' && (
                                <>
                                  {getPurchasedMachines().length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-3 text-center">
                                      No purchased machines found.
                                    </p>
                                  ) : (
                                    getPurchasedMachines().map((machine, index) => (
                                      <div
                                        key={machine.id + '-' + machine.serialNumber + '-' + index}
                                        onClick={() => {
                                          setSelectedMachine(machine);
                                          setNewTicket((prev) => ({
                                            ...prev,
                                            productId: machine.id,
                                            contractReferenceId: machine.contractReferenceId || '',
                                            productBrand: 'Xerox',
                                            productModel: machine.modelName,
                                            productName: machine.modelName,
                                            serialNumber: machine.serialNumber,
                                            serviceContext: machine.isUnderWarranty
                                              ? 'WARRANTY'
                                              : 'CHARGEABLE',
                                            jobType: 'ONSITE',
                                          }));
                                        }}
                                        className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 ${
                                          selectedMachine?.serialNumber === machine.serialNumber
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="font-bold text-slate-800">
                                            {machine.modelName}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              machine.isUnderWarranty
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {machine.isUnderWarranty
                                              ? 'Under Warranty'
                                              : 'Warranty Expired'}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                          <div>
                                            Serial:{' '}
                                            <span className="font-mono text-slate-700 font-semibold">
                                              {machine.serialNumber}
                                            </span>
                                          </div>
                                          <div>
                                            Purchase Date:{' '}
                                            <span className="font-semibold text-slate-700">
                                              {machine.purchaseDate}
                                            </span>
                                          </div>
                                          {machine.isUnderWarranty ? (
                                            <>
                                              <div>
                                                Remaining Time:{' '}
                                                <span className="text-emerald-700 font-bold">
                                                  {machine.remainingTime}
                                                </span>
                                              </div>
                                              <div>
                                                Remaining Copies:{' '}
                                                <span className="text-emerald-700 font-bold">
                                                  {machine.remainingCopies}
                                                </span>
                                              </div>
                                            </>
                                          ) : (
                                            machine.expiredFirst && (
                                              <div className="col-span-2">
                                                Expired First:{' '}
                                                <span className="text-red-700 font-bold">
                                                  {machine.expiredFirst}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}

                              {activeMachineTab === 'contract' && (
                                <>
                                  {getContractMachines().length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-3 text-center">
                                      No contracts found.
                                    </p>
                                  ) : (
                                    getContractMachines().map((machine, index) => (
                                      <div
                                        key={machine.id + '-' + machine.serialNumber + '-' + index}
                                        onClick={() => {
                                          setSelectedMachine(machine);
                                          setNewTicket((prev) => ({
                                            ...prev,
                                            productId: machine.id,
                                            contractReferenceId: machine.contractReferenceId || '',
                                            productBrand: 'Xerox',
                                            productModel: machine.modelName,
                                            productName: machine.modelName,
                                            serialNumber: machine.serialNumber,
                                            serviceContext: machine.type,
                                            jobType: 'ONSITE',
                                          }));
                                        }}
                                        className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 ${
                                          selectedMachine?.serialNumber === machine.serialNumber
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="font-bold text-slate-800">
                                            {machine.modelName}
                                          </span>
                                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                            {machine.contractType}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                          <div>
                                            Serial:{' '}
                                            <span className="font-mono text-slate-700 font-semibold">
                                              {machine.serialNumber}
                                            </span>
                                          </div>
                                          <div>
                                            Expiry Date:{' '}
                                            <span className="font-semibold text-slate-700">
                                              {machine.effectiveTo}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}

                              {activeMachineTab === 'external' && (
                                <>
                                  {getExternalMachines().length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-3 text-center">
                                      No external machines found.
                                    </p>
                                  ) : (
                                    getExternalMachines().map((machine, index) => (
                                      <div
                                        key={machine.id + '-' + machine.serialNumber + '-' + index}
                                        onClick={() => {
                                          setSelectedMachine(machine);
                                          setNewTicket((prev) => ({
                                            ...prev,
                                            productId: machine.id,
                                            contractReferenceId: machine.contractReferenceId || '',
                                            productBrand: machine.brandName || 'Xerox',
                                            productModel: machine.modelName,
                                            productName: machine.modelName,
                                            serialNumber: machine.serialNumber,
                                            serviceContext: machine.contractType || 'CHARGEABLE',
                                            jobType: 'ONSITE',
                                          }));
                                        }}
                                        className={`p-2.5 border rounded-xl cursor-pointer text-xs transition flex flex-col gap-1 ${
                                          selectedMachine?.serialNumber === machine.serialNumber
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="font-bold text-slate-800">
                                            {machine.modelName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {machine.contractType && (
                                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-1.5 py-0.5 rounded">
                                                Under {machine.contractType}
                                              </span>
                                            )}
                                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                              EXTERNAL
                                            </span>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                          <div>
                                            Serial:{' '}
                                            <span className="font-mono text-slate-700 font-semibold">
                                              {machine.serialNumber}
                                            </span>
                                          </div>
                                          <div>
                                            Current Meter:{' '}
                                            <span className="font-semibold text-slate-700">
                                              {machine.meterReading}
                                            </span>
                                          </div>
                                          {machine.contractType && (
                                            <div className="col-span-2">
                                              Active Contract:{' '}
                                              <span className="font-bold text-indigo-600">
                                                {machine.contractType}
                                              </span>
                                              {machine.effectiveTo && (
                                                <span className="text-slate-500">
                                                  {' '}
                                                  · valid until{' '}
                                                  {new Date(
                                                    machine.effectiveTo,
                                                  ).toLocaleDateString()}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsOtherMachine(true);
                                  setSelectedMachine(null);
                                  setNewTicket((prev) => ({
                                    ...prev,
                                    productId: '',
                                    contractReferenceId: '',
                                    productBrand: '',
                                    productModel: '',
                                    productName: '',
                                    serialNumber: '',
                                    serviceContext: 'CHARGEABLE',
                                    jobType: 'ONSITE',
                                  }));
                                }}
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                Other Machine (Not from Xerocare)
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Manual Entry Mode */
                          <div className="border border-slate-100 rounded-2xl p-4 bg-amber-50/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-800">
                                Other Machine (Not from Xerocare)
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsOtherMachine(false)}
                                className="text-[11px] text-primary font-bold hover:underline"
                              >
                                ← Back to Machine Registry
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Product Brand
                                </label>
                                <div className="flex gap-1.5 items-center">
                                  <div className="flex-1 min-w-0">
                                    <SearchableSelect
                                      options={brands.map((b) => ({
                                        value: b.name,
                                        label: b.name,
                                      }))}
                                      value={newTicket.productBrand}
                                      onValueChange={(val) =>
                                        setNewTicket((prev) => ({
                                          ...prev,
                                          productBrand: val,
                                          productModel: '',
                                          productName: '',
                                        }))
                                      }
                                      placeholder="Select brand..."
                                      className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCreateBrandModal(true)}
                                    className="h-9 w-9 shrink-0 border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500"
                                  >
                                    <Plus size={16} />
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Product Model
                                </label>
                                <div className="flex gap-1.5 items-center">
                                  <div className="flex-1 min-w-0">
                                    <SearchableSelect
                                      options={models
                                        .filter(
                                          (m) =>
                                            !newTicket.productBrand ||
                                            m.brandRelation?.name?.toLowerCase() ===
                                              newTicket.productBrand.toLowerCase(),
                                        )
                                        .map((m) => ({
                                          value: m.model_no,
                                          label: `${m.model_name} (${m.model_no})`,
                                        }))}
                                      value={newTicket.productModel}
                                      onValueChange={(val) => {
                                        const m = models.find((x) => x.model_no === val);
                                        setNewTicket((prev) => ({
                                          ...prev,
                                          productModel: val,
                                          productName: m ? m.model_name : val,
                                        }));
                                      }}
                                      placeholder="Select model..."
                                      className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleOpenCreateModel}
                                    className="h-9 w-9 shrink-0 border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500"
                                  >
                                    <Plus size={16} />
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Product Name
                                </label>
                                <Input
                                  placeholder="e.g. Printer Model X"
                                  value={newTicket.productName}
                                  onChange={(e) =>
                                    setNewTicket({ ...newTicket, productName: e.target.value })
                                  }
                                  className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Serial Number
                                </label>
                                <Input
                                  placeholder="e.g. SN-12345"
                                  value={newTicket.serialNumber}
                                  onChange={(e) =>
                                    setNewTicket({ ...newTicket, serialNumber: e.target.value })
                                  }
                                  className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC COVERAGE PREVIEW PANEL */}
                    {selectedMachine && (
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                          <span>Machine & Coverage Details</span>
                          {machineContextLoading ? (
                            <span className="text-[10px] text-slate-400 font-normal animate-pulse">
                              Checking coverage...
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                              {machineContextData?.serviceContext || 'CHARGEABLE'}
                            </span>
                          )}
                        </h4>

                        {machineContextLoading ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            Loading machine coverage context...
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                  Machine Model
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {selectedMachine.modelName}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                  Serial Number
                                </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {selectedMachine.serialNumber}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                  Ownership Status
                                </span>
                                <span className="font-semibold text-slate-800 uppercase">
                                  {selectedMachine.type || 'UNKNOWN'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                  Warranty / Contract Expiry
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {machineContextData?.contract?.endDate
                                    ? new Date(
                                        machineContextData.contract.endDate,
                                      ).toLocaleDateString()
                                    : machineContextData?.warrantyInfo?.warrantyEndDate
                                      ? new Date(
                                          machineContextData.warrantyInfo.warrantyEndDate,
                                        ).toLocaleDateString()
                                      : selectedMachine.effectiveTo || 'None'}
                                </span>
                              </div>
                            </div>

                            {/* METER READING — copies can expire a warranty before time does */}
                            {(selectedMachine.type === 'SALE' ||
                              selectedMachine.type === 'LEASE') && (
                              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
                                  Current Meter Reading (Total Copies)
                                  {machineContextData?.warrantyInfo?.copyLimit != null && ' *'}
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="Ask the customer for the machine's current meter reading..."
                                  value={meterReadingInput}
                                  onChange={(e) => setMeterReadingInput(e.target.value)}
                                  className="h-9 text-xs bg-white border-amber-200 rounded-xl focus-visible:ring-amber-500 font-mono"
                                />
                                {machineContextData?.warrantyInfo && (
                                  <p
                                    className={`text-[11px] font-semibold ${
                                      machineContextData.warrantyInfo.isUnderWarranty
                                        ? 'text-emerald-700'
                                        : 'text-red-700'
                                    }`}
                                  >
                                    {machineContextData.warrantyInfo.isUnderWarranty
                                      ? `Under warranty${
                                          machineContextData.warrantyInfo.copiesRemaining != null
                                            ? ` — ${machineContextData.warrantyInfo.copiesRemaining.toLocaleString()} copies remaining`
                                            : ''
                                        }${
                                          machineContextData.warrantyInfo.warrantyEndDate
                                            ? ` (until ${new Date(machineContextData.warrantyInfo.warrantyEndDate).toLocaleDateString()})`
                                            : ''
                                        }`
                                      : `Warranty expired${
                                          machineContextData.warrantyInfo.expiredBy
                                            ? ` — limit hit: ${machineContextData.warrantyInfo.expiredBy}`
                                            : ''
                                        }. Service will be chargeable.`}
                                  </p>
                                )}
                              </div>
                            )}

                            {machineContextData?.contract && (
                              <div className="p-2.5 bg-blue-50/50 border border-blue-100/50 rounded-xl space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-blue-800">
                                    Active {machineContextData.contract.contractType} Agreement
                                  </span>
                                  <span className="font-bold text-blue-700 text-[10px]">
                                    Valued: {getActiveCurrency()}{' '}
                                    {Number(machineContextData.contract.contractValue).toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-blue-600/80">
                                  Period:{' '}
                                  {new Date(
                                    machineContextData.contract.startDate,
                                  ).toLocaleDateString()}{' '}
                                  →{' '}
                                  {new Date(
                                    machineContextData.contract.endDate,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            )}

                            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                                Coverage Checklist
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {(
                                  [
                                    { key: 'labour', label: 'Labour Cost' },
                                    { key: 'spareParts', label: 'Spare Parts' },
                                    { key: 'toner', label: 'Toner / Consumables' },
                                    { key: 'travel', label: 'Travel & Transport' },
                                  ] as const
                                ).map(({ key, label }) => {
                                  const covered = !!machineContextData?.coverage?.[key];
                                  return (
                                    <div key={key} className="flex items-center gap-1.5 text-xs">
                                      {covered ? (
                                        <span className="text-emerald-500 font-bold">✓</span>
                                      ) : (
                                        <span className="text-rose-500 font-bold">✗</span>
                                      )}
                                      <span
                                        className={
                                          covered
                                            ? 'text-slate-700 font-medium'
                                            : 'text-slate-400 line-through'
                                        }
                                      >
                                        {label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {machineContextData?.contractUsage && (
                                <p
                                  className={`text-[11px] font-semibold ${
                                    machineContextData.contractUsage.limitExceeded
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Contract copies:{' '}
                                  {machineContextData.contractUsage.copiesUsed.toLocaleString()} /{' '}
                                  {machineContextData.contractUsage.copyLimit.toLocaleString()} used
                                  {machineContextData.contractUsage.limitExceeded
                                    ? ` — limit exceeded, overage billed at ${machineContextData.contractUsage.overagePerCopyRate}/copy`
                                    : ` (${machineContextData.contractUsage.copiesRemaining.toLocaleString()} remaining)`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PATH 2: NEW CUSTOMER FLOW */}
                {creationPath === 'new' && (
                  <div className="space-y-4">
                    {/* CRM Lead Details */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                        <Plus size={14} className="text-primary" /> Customer Contact Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Full Name *
                          </label>
                          <Input
                            placeholder="e.g. John Doe"
                            value={leadForm.name}
                            onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Phone Number *
                          </label>
                          <Input
                            placeholder="e.g. +974 5555 1234"
                            value={leadForm.phone}
                            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Email (Optional)
                          </label>
                          <Input
                            placeholder="e.g. john@example.com"
                            value={leadForm.email}
                            onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Location/City *
                          </label>
                          <Input
                            placeholder="e.g. Doha, Qatar"
                            value={leadForm.location}
                            onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5">
                        Product Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Product Brand *
                          </label>
                          <div className="flex gap-1.5 items-center">
                            <div className="flex-1 min-w-0">
                              <SearchableSelect
                                options={brands.map((b) => ({ value: b.name, label: b.name }))}
                                value={newTicket.productBrand}
                                onValueChange={(val) =>
                                  setNewTicket((prev) => ({
                                    ...prev,
                                    productBrand: val,
                                    productModel: '',
                                    productName: '',
                                  }))
                                }
                                placeholder="Select brand..."
                                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowCreateBrandModal(true)}
                              className="h-9 w-9 shrink-0 border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500"
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Product Model *
                          </label>
                          <div className="flex gap-1.5 items-center">
                            <div className="flex-1 min-w-0">
                              <SearchableSelect
                                options={models
                                  .filter(
                                    (m) =>
                                      !newTicket.productBrand ||
                                      m.brandRelation?.name?.toLowerCase() ===
                                        newTicket.productBrand.toLowerCase(),
                                  )
                                  .map((m) => ({
                                    value: m.model_no,
                                    label: `${m.model_name} (${m.model_no})`,
                                  }))}
                                value={newTicket.productModel}
                                onValueChange={(val) => {
                                  const m = models.find((x) => x.model_no === val);
                                  setNewTicket((prev) => ({
                                    ...prev,
                                    productModel: val,
                                    productName: m ? m.model_name : val,
                                  }));
                                }}
                                placeholder="Select model..."
                                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleOpenCreateModel}
                              className="h-9 w-9 shrink-0 border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500"
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Product Name *
                          </label>
                          <Input
                            placeholder="e.g. Color Copier"
                            value={newTicket.productName}
                            onChange={(e) =>
                              setNewTicket({ ...newTicket, productName: e.target.value })
                            }
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Serial Number
                          </label>
                          <Input
                            placeholder="e.g. SN-12345"
                            value={newTicket.serialNumber}
                            onChange={(e) =>
                              setNewTicket({ ...newTicket, serialNumber: e.target.value })
                            }
                            className="h-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-primary font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 & 4: JOB TYPE & REMAINING FIELDS */}
                {((creationPath === 'existing' && (selectedMachine || isOtherMachine)) ||
                  creationPath === 'new') && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    {/* Information Banner */}
                    {(() => {
                      let bannerClass = '';
                      let bannerText = '';

                      if (creationPath === 'new' || isOtherMachine) {
                        bannerClass = 'bg-orange-50 border-orange-200 text-orange-800';
                        bannerText =
                          'External/New Lead Machine. Service will be charged under standard rates (CHARGEABLE).';
                      } else if (selectedMachine) {
                        const ctx = newTicket.serviceContext;
                        if (ctx === 'RENT') {
                          bannerClass = 'bg-blue-50 border-blue-200 text-blue-800';
                          bannerText =
                            'Active Rent Contract: Repair service & spare parts are fully covered.';
                        } else if (ctx === 'LEASE_UNDER_WARRANTY') {
                          bannerClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                          bannerText =
                            'Lease Under Warranty: Service, labour & spare parts covered. Toner/consumables are chargeable.';
                        } else if (ctx === 'LEASE_EXPIRED') {
                          bannerClass = 'bg-red-50 border-red-200 text-red-800';
                          bannerText = `Lease Warranty EXPIRED (Limit hit: ${
                            machineContextData?.warrantyInfo?.expiredBy ||
                            selectedMachine.expiredFirst ||
                            'TIME/COPIES'
                          }). Repairs will be CHARGEABLE.`;
                        } else if (ctx === 'WARRANTY') {
                          bannerClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                          bannerText =
                            'Purchased Machine Under Warranty: Repair service & spare parts covered. Toner/consumables are chargeable.';
                        } else if (ctx === 'CHARGEABLE') {
                          bannerClass = 'bg-orange-50 border-orange-200 text-orange-800';
                          bannerText =
                            'Purchased Machine: Out of warranty. Standard service charges apply.';
                        } else if (['AMC', 'FSMA', 'SMA'].includes(ctx)) {
                          bannerClass = 'bg-blue-50 border-blue-200 text-blue-800';
                          bannerText = `Active ${ctx} Service Contract: Maintenance & breakdown repairs are covered.`;
                        }
                      }

                      if (!bannerText) return null;
                      return (
                        <div
                          className={`p-3 border rounded-xl text-xs font-semibold ${bannerClass}`}
                        >
                          {bannerText}
                        </div>
                      );
                    })()}

                    {/* Job Type selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Job Type
                        </label>
                        {(() => {
                          const lockOnsite =
                            creationPath === 'existing' &&
                            !isOtherMachine &&
                            selectedMachine &&
                            ['RENT', 'LEASE_UNDER_WARRANTY', 'AMC', 'FSMA', 'SMA'].includes(
                              newTicket.serviceContext,
                            );

                          if (lockOnsite) {
                            return (
                              <div className="h-9 px-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between">
                                <span>Warranty / On-Site</span>
                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                  LOCKED
                                </span>
                              </div>
                            );
                          }

                          return (
                            <select
                              value={newTicket.jobType}
                              onChange={(e) =>
                                setNewTicket({ ...newTicket, jobType: e.target.value })
                              }
                              className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                            >
                              <option value="ONSITE">On-Site</option>
                              <option value="BRING_TO_CENTRE">Service Centre</option>
                            </select>
                          );
                        })()}
                      </div>

                      {/* Scheduled visit date (only if ONSITE) */}
                      {newTicket.jobType === 'ONSITE' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Scheduled Visit Date *
                          </label>
                          <Input
                            type="date"
                            min={todayLocalISO()}
                            value={newTicket.scheduledVisitDate}
                            onChange={(e) =>
                              setNewTicket({ ...newTicket, scheduledVisitDate: e.target.value })
                            }
                            className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                          />
                        </div>
                      )}
                    </div>

                    {/* Site location (only if ONSITE) — visit charge is priced from it */}
                    {newTicket.jobType === 'ONSITE' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Site Location (for visit charge)
                        </label>
                        <Input
                          placeholder="e.g. Doha — Industrial Area, Street 24"
                          value={newTicket.serviceLocation}
                          onChange={(e) =>
                            setNewTicket({ ...newTicket, serviceLocation: e.target.value })
                          }
                          className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                        />
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          Visit / estimate charge is decided based on this location.
                        </p>
                      </div>
                    )}

                    {/* Issue Description */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Issue Description *
                      </label>
                      <Textarea
                        placeholder="Describe the symptoms, error codes, and customer requirements..."
                        value={newTicket.issueDescription}
                        onChange={(e) =>
                          setNewTicket({ ...newTicket, issueDescription: e.target.value })
                        }
                        className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[80px]"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetTicketForm();
                  }}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs"
                >
                  {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Create
                  Ticket
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {showCreateLeadModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-primary" size={18} /> Create New Lead
              </CardTitle>
              <CardDescription className="text-xs">
                Enter details to create a new lead in the CRM and associate it with this ticket.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateLead}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Lead Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. John Doe / Company A"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Location / Address
                  </label>
                  <Input
                    placeholder="e.g. Downtown Office, Suite 404"
                    value={leadForm.location}
                    onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. lead@example.com"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. +1 555-0199"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateLeadModal(false);
                    setLeadForm({ name: '', location: '', email: '', phone: '' });
                  }}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingLead}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {creatingLead && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Create &
                  Associate
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE BRAND MODAL — same dialog as the Brand management page */}
      <AddBrandDialog
        open={showCreateBrandModal}
        onOpenChange={setShowCreateBrandModal}
        onSuccess={handleBrandCreated}
      />

      {/* CREATE MODEL MODAL — same dialog as the Model management page */}
      {showCreateModelModal && (
        <ModelFormModal
          initialData={null}
          onClose={() => setShowCreateModelModal(false)}
          onConfirm={handleModelCreated}
        />
      )}

      {/* ASSIGN / CHANGE TECHNICIAN MODAL */}
      {showAssignModal &&
        selectedTicket &&
        (() => {
          const currentTech = technicians.find((t) => t.id === selectedTicket.assignedTechnicianId);
          const isReassignment = !!selectedTicket.assignedTechnicianId;
          return (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                  <CardTitle className="text-base font-bold text-slate-800">
                    {isReassignment ? 'Change Technician' : 'Assign Technician'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isReassignment
                      ? 'Swap the technician handling this ticket. The new technician gets target credit once the job is completed.'
                      : 'Select a qualified field technician to assign to this service ticket.'}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAssignTechnician}>
                  <CardContent className="p-6 space-y-4">
                    {isReassignment && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] font-semibold text-amber-800">
                        Currently assigned to{' '}
                        <span className="font-bold">
                          {currentTech
                            ? `${currentTech.first_name || ''} ${currentTech.last_name || ''}`.trim() ||
                              currentTech.email
                            : 'Unknown technician'}
                        </span>
                        . Changing this reassigns the job and its target credit to the new
                        technician.
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {isReassignment ? 'New Technician' : 'Technician'}
                      </label>
                      <SearchableSelect
                        options={technicians.map((t) => ({
                          value: t.id,
                          label: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email,
                          description: t.email || undefined,
                        }))}
                        value={assignForm.technicianId}
                        onValueChange={(val) => setAssignForm({ ...assignForm, technicianId: val })}
                        placeholder="Search technician by name or email..."
                        className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                      />
                    </div>
                  </CardContent>
                  <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAssignModal(false);
                        setAssignForm({ technicianId: '' });
                      }}
                      className="rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        submitting ||
                        !assignForm.technicianId ||
                        assignForm.technicianId === selectedTicket.assignedTechnicianId
                      }
                      className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                    >
                      {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      {isReassignment ? 'Change Job' : 'Assign Job'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          );
        })()}

      {/* DIAGNOSE TICKET MODAL */}
      {showDiagnoseModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 shrink-0">
                  <Wrench className="size-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Technician Diagnosis
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {selectedTicket.ticketNumber}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Record issue diagnosis notes and declare parts that need to be replaced.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleDiagnose}>
              <CardContent className="p-6 space-y-4 max-h-[62vh] overflow-y-auto">
                {/* Machine + Complaint context */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Machine Under Service
                    </h4>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {[selectedTicket.productBrand, selectedTicket.productModel]
                        .filter(Boolean)
                        .join(' ') ||
                        selectedTicket.productName ||
                        'Machine details not recorded'}
                    </p>
                    {selectedTicket.serialNumber && (
                      <p className="text-[11px] font-mono text-slate-500">
                        SN: {selectedTicket.serialNumber}
                      </p>
                    )}
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 space-y-1">
                    <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      Complaint Raised by Customer
                    </h4>
                    <p className="text-xs text-amber-950 font-semibold whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.issueDescription || 'No complaint details provided.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Problem Found / Symptoms
                    </label>
                    <Input
                      required
                      placeholder="e.g. Paper jams in duplexer, toner leaking"
                      value={diagnosisForm.problemFound}
                      onChange={(e) =>
                        setDiagnosisForm({ ...diagnosisForm, problemFound: e.target.value })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Root Cause
                    </label>
                    <Input
                      required
                      placeholder="e.g. Worn duplex rollers, cracked toner cartridge"
                      value={diagnosisForm.rootCause}
                      onChange={(e) =>
                        setDiagnosisForm({ ...diagnosisForm, rootCause: e.target.value })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Current Meter Reading
                    </label>
                    <Input
                      type="number"
                      required
                      min={0}
                      placeholder="Enter current page count"
                      value={diagnosisForm.meterReading ?? 0}
                      onChange={(e) =>
                        setDiagnosisForm({
                          ...diagnosisForm,
                          meterReading: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Diagnosis Notes
                    </label>
                    <Textarea
                      required
                      placeholder="Provide details of the findings, diagnostic tests run, and repairs needed..."
                      value={diagnosisForm.notes}
                      onChange={(e) =>
                        setDiagnosisForm({ ...diagnosisForm, notes: e.target.value })
                      }
                      className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[40px]"
                    />
                  </div>
                </div>

                {['CHARGEABLE', 'LEASE_EXPIRED', 'EXTERNAL_MACHINE'].includes(
                  selectedTicket.serviceContext,
                ) && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Labor Cost / Service Charge ({getActiveCurrency()})
                    </label>
                    <Input
                      type="number"
                      required
                      min={0}
                      placeholder="Enter labor/service charge"
                      value={diagnosisForm.labourCost ?? 0}
                      onChange={(e) =>
                        setDiagnosisForm({
                          ...diagnosisForm,
                          labourCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="size-3.5 text-slate-400" />
                      Spare Parts / Items Required
                      {diagnosisForm.items.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          ({diagnosisForm.items.length})
                        </span>
                      )}
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDiagnosisItem}
                      className="border-slate-200 text-xs font-bold text-primary rounded-xl h-8 gap-1.5"
                    >
                      <Plus size={12} /> Add Item
                    </Button>
                  </div>

                  {diagnosisForm.items.length === 0 && (
                    <div className="border border-dashed border-slate-200 rounded-xl py-6 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        No parts added. Click{' '}
                        <span className="font-bold text-slate-500">Add Item</span> if the repair
                        needs parts.
                      </p>
                    </div>
                  )}

                  {diagnosisForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white border border-slate-200 rounded-md px-2 py-0.5">
                          Item {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDiagnosisItem(idx)}
                          className="text-red-500 text-[11px] font-bold hover:bg-red-50 hover:text-red-600 rounded-lg h-7 px-2 gap-1"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                            Item Source
                          </label>
                          <select
                            value={item.itemSource}
                            onChange={(e) => updateDiagnosisItem(idx, 'itemSource', e.target.value)}
                            className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                          >
                            <option value="SPARE_PART">Registered Spare Part</option>
                            <option value="CUSTOM">Unregistered Custom Part</option>
                          </select>
                        </div>

                        {item.itemSource === 'SPARE_PART' ? (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                              Spare Part
                            </label>
                            <SearchableSelect
                              options={spareParts.map((sp) => ({
                                value: sp.id,
                                label: `${sp.part_name} (${sp.sku})`,
                                description: `${sp.brand ? `Brand: ${sp.brand} · ` : ''}${sp.mpn ? `MPN: ${sp.mpn} · ` : ''}Base Price: ${getActiveCurrency()} ${sp.base_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                              }))}
                              value={item.sparePartId}
                              onValueChange={(val) => updateDiagnosisItem(idx, 'sparePartId', val)}
                              placeholder="Search spare part..."
                              className="h-9 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700 w-full"
                            />
                            {item.sparePartId &&
                              (() => {
                                const sp = spareParts.find((p) => p.id === item.sparePartId);
                                if (!sp) return null;
                                return (
                                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Brand: {sp.brand || '—'} · Mfg. Part No: {sp.mpn || '—'}
                                  </p>
                                );
                              })()}
                          </div>
                        ) : (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                              Custom Part Name
                            </label>
                            <Input
                              required
                              placeholder="e.g. Custom Laser Roller"
                              value={item.customPartName}
                              onChange={(e) => {
                                updateDiagnosisItem(idx, 'customPartName', e.target.value);
                                updateDiagnosisItem(idx, 'partName', e.target.value);
                              }}
                              className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      {item.itemSource === 'CUSTOM' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                Brand
                              </label>
                              <Input
                                placeholder="e.g. Generic / HP"
                                value={item.customPartBrand}
                                onChange={(e) =>
                                  updateDiagnosisItem(idx, 'customPartBrand', e.target.value)
                                }
                                className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                Model Name
                              </label>
                              <Input
                                placeholder="e.g. VersaLink C405"
                                value={item.customPartDescription}
                                onChange={(e) =>
                                  updateDiagnosisItem(idx, 'customPartDescription', e.target.value)
                                }
                                className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                Mfg. Part Number
                              </label>
                              <Input
                                placeholder="e.g. CB435A"
                                value={item.mpn}
                                onChange={(e) => updateDiagnosisItem(idx, 'mpn', e.target.value)}
                                className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Info className="size-3 shrink-0" />
                            Brand and Model Name are pre-filled from the machine on this ticket —
                            edit if the part differs.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            required
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateDiagnosisItem(idx, 'quantity', parseInt(e.target.value, 10))
                            }
                            className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                            Unit Price ({getActiveCurrency()})
                          </label>
                          <Input
                            type="number"
                            required
                            min={0}
                            disabled={item.itemSource === 'SPARE_PART'}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateDiagnosisItem(idx, 'unitPrice', parseFloat(e.target.value))
                            }
                            className="h-9 text-xs bg-white border-slate-200 rounded-lg disabled:opacity-60"
                          />
                        </div>
                        <label className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.isFree}
                            onChange={(e) => updateDiagnosisItem(idx, 'isFree', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-[11px] font-bold text-slate-600">Free / FOC</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TRACK B EXTRA PRICING AND REVISION FIELDS */}
                {selectedTicket.track !== 'A' && (
                  <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Estimate & Pricing Details
                    </h4>

                    {(() => {
                      const travelCovered = [
                        'AMC',
                        'SMA',
                        'FSMA',
                        'RENT',
                        'WARRANTY',
                        'LEASE_UNDER_WARRANTY',
                      ].includes(selectedTicket.serviceContext);
                      return (
                        <>
                          {travelCovered && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] font-bold text-emerald-700">
                              Visit &amp; transportation charges are FREE — this machine is covered
                              by {selectedTicket.serviceContext.replace(/_/g, ' ')}.
                            </div>
                          )}
                          {!travelCovered && selectedTicket.serviceLocation && (
                            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-[11px] font-semibold text-sky-800">
                              📍 Site location:{' '}
                              <span className="font-bold">{selectedTicket.serviceLocation}</span> —
                              price the visit charge based on this.
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Visit Charge ({getActiveCurrency()})
                              </label>
                              <Input
                                type="number"
                                min={0}
                                disabled={travelCovered}
                                value={travelCovered ? '' : diagnosisForm.visitChargeAmount || ''}
                                placeholder={travelCovered ? 'FREE (covered)' : ''}
                                onChange={(e) =>
                                  setDiagnosisForm({
                                    ...diagnosisForm,
                                    visitChargeAmount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl disabled:opacity-60"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Visit Charge Method
                              </label>
                              <select
                                value={diagnosisForm.visitChargeMethod}
                                disabled={travelCovered}
                                onChange={(e) =>
                                  setDiagnosisForm({
                                    ...diagnosisForm,
                                    visitChargeMethod: e.target.value as
                                      | 'ADDED_TO_ESTIMATE'
                                      | 'SEPARATE',
                                  })
                                }
                                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent animate-none disabled:opacity-60"
                              >
                                <option value="ADDED_TO_ESTIMATE">
                                  Add to Estimate (collect after work)
                                </option>
                                <option value="SEPARATE">Separate Cash On-Site</option>
                              </select>
                            </div>
                          </div>

                          {!travelCovered &&
                            diagnosisForm.visitChargeMethod === 'SEPARATE' &&
                            (diagnosisForm.visitChargeAmount || 0) > 0 && (
                              <>
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                                  <input
                                    type="checkbox"
                                    id="visit-charge-collected"
                                    checked={diagnosisForm.visitChargeCollected}
                                    onChange={(e) =>
                                      setDiagnosisForm({
                                        ...diagnosisForm,
                                        visitChargeCollected: e.target.checked,
                                      })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  />
                                  <label
                                    htmlFor="visit-charge-collected"
                                    className="text-[11px] font-bold text-amber-800"
                                  >
                                    Cash collected on-site — post {getActiveCurrency()}{' '}
                                    {Number(diagnosisForm.visitChargeAmount || 0).toFixed(2)} to
                                    accounts now
                                  </label>
                                </div>

                                {diagnosisForm.visitChargeCollected && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        Payment Mode
                                      </label>
                                      <select
                                        value={diagnosisForm.visitChargePaymentMode}
                                        onChange={(e) =>
                                          setDiagnosisForm({
                                            ...diagnosisForm,
                                            visitChargePaymentMode: e.target.value,
                                            visitChargeAccountId: '',
                                          })
                                        }
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                      >
                                        <option value="">Select mode...</option>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="CREDIT_CARD">Credit Card</option>
                                      </select>
                                    </div>
                                    {diagnosisForm.visitChargePaymentMode &&
                                      diagnosisForm.visitChargePaymentMode !== 'CHEQUE' && (
                                        <div>
                                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            Deposit To Account
                                          </label>
                                          <select
                                            value={diagnosisForm.visitChargeAccountId}
                                            onChange={(e) =>
                                              setDiagnosisForm({
                                                ...diagnosisForm,
                                                visitChargeAccountId: e.target.value,
                                              })
                                            }
                                            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                          >
                                            <option value="">Select account...</option>
                                            {cashBankAccounts.map((a) => (
                                              <option key={a.id} value={a.id}>
                                                {a.name} ({a.type})
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </>
                            )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Transportation / Pickup Charge ({getActiveCurrency()})
                              </label>
                              <Input
                                type="number"
                                min={0}
                                disabled={travelCovered}
                                value={
                                  travelCovered ? '' : diagnosisForm.transportChargeAmount || ''
                                }
                                placeholder={
                                  travelCovered
                                    ? 'FREE (covered)'
                                    : selectedTicket.jobType === 'BRING_TO_CENTRE'
                                      ? 'Machine taken to workshop — enter charge'
                                      : 'Only if machine is taken to workshop'
                                }
                                onChange={(e) =>
                                  setDiagnosisForm({
                                    ...diagnosisForm,
                                    transportChargeAmount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl disabled:opacity-60"
                              />
                              {selectedTicket.jobType === 'BRING_TO_CENTRE' && !travelCovered && (
                                <p className="mt-1 text-[10px] font-semibold text-amber-600">
                                  This ticket is marked Bring-to-Centre — remember the pickup &
                                  delivery cost.
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Discount ({getActiveCurrency()})
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={diagnosisForm.discountAmount || ''}
                                onChange={(e) =>
                                  setDiagnosisForm({
                                    ...diagnosisForm,
                                    discountAmount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                              />
                              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                Applied on the total estimate amount.
                              </p>
                            </div>
                          </div>

                          <div>
                            {/* Live Calculation display */}
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Grand Service Estimate Total
                            </label>
                            <div className="h-9 px-3 flex items-center justify-between bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                              <span>{getActiveCurrency()}</span>
                              <span>
                                {(() => {
                                  const partsTotal = diagnosisForm.items.reduce(
                                    (sum, item) =>
                                      sum + (item.isFree ? 0 : item.quantity * item.unitPrice),
                                    0,
                                  );
                                  const laborTotal = diagnosisForm.labourCost || 0;
                                  const transportTotal = travelCovered
                                    ? 0
                                    : diagnosisForm.transportChargeAmount || 0;
                                  const visitChargeToAdd =
                                    !travelCovered &&
                                    diagnosisForm.visitChargeMethod === 'ADDED_TO_ESTIMATE'
                                      ? diagnosisForm.visitChargeAmount || 0
                                      : 0;
                                  const totalEstimate = Math.max(
                                    0,
                                    partsTotal +
                                      laborTotal +
                                      transportTotal +
                                      visitChargeToAdd -
                                      (diagnosisForm.discountAmount || 0),
                                  );
                                  return totalEstimate.toFixed(2);
                                })()}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Technician Note to Finance */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Technician Note to Finance{' '}
                        {(selectedTicket.status === 'REVISED' ||
                          selectedTicket.status === 'FINANCE_REJECTED' ||
                          (selectedTicket.additionalEstimateCount &&
                            selectedTicket.additionalEstimateCount > 0)) && (
                          <span className="text-red-500">* Required</span>
                        )}
                      </label>
                      <textarea
                        placeholder="Explain details for finance approval/revision reasoning..."
                        value={diagnosisForm.technicianNoteToFinance}
                        onChange={(e) =>
                          setDiagnosisForm({
                            ...diagnosisForm,
                            technicianNoteToFinance: e.target.value,
                          })
                        }
                        className="w-full min-h-[70px] p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDiagnoseModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Submit Diagnosis
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* SUBMIT QUOTATION MODAL */}
      {showQuoteModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Submit Service Quotation
              </CardTitle>
              <CardDescription className="text-xs">
                Compile parts and labor costs. This will create a quotation record in the Billing
                system.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitQuote}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Labor Cost / Service Charge ($)
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={quoteForm.laborCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, laborCost: parseFloat(e.target.value) })
                    }
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowQuoteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Submit Quotation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* COMPLETE SERVICE JOB MODAL */}
      {showCompleteModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Complete Service Job
              </CardTitle>
              <CardDescription className="text-xs">
                Confirm completion of repair. This will decrement inventory spare part stock levels
                and record machine lifetime analytics.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCompleteService}>
              <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Work Performed
                    </label>
                    <Textarea
                      required
                      placeholder="Detail work done, tests completed..."
                      value={completeForm.workPerformed}
                      onChange={(e) =>
                        setCompleteForm({ ...completeForm, workPerformed: e.target.value })
                      }
                      className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[60px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Resolution Details
                    </label>
                    <Textarea
                      required
                      placeholder="Detail resolution, e.g. feed path cleaned..."
                      value={completeForm.resolutionDetails}
                      onChange={(e) =>
                        setCompleteForm({ ...completeForm, resolutionDetails: e.target.value })
                      }
                      className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Completion Meter Reading
                    </label>
                    <Input
                      type="number"
                      required
                      min={0}
                      placeholder="Enter the machine's current page count"
                      value={completeForm.meterReading || ''}
                      onChange={(e) =>
                        setCompleteForm({
                          ...completeForm,
                          meterReading: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Customer Remarks
                    </label>
                    <Input
                      placeholder="Optional feedback from the client..."
                      value={completeForm.customerRemarks}
                      onChange={(e) =>
                        setCompleteForm({ ...completeForm, customerRemarks: e.target.value })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Technician Remarks
                  </label>
                  <Input
                    placeholder="Optional technician notes..."
                    value={completeForm.technicianRemarks}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, technicianRemarks: e.target.value })
                    }
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Mark Completed
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CUSTOMER INTEL MODAL */}
      {showIntelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <History className="text-primary" size={18} /> Customer Intelligence View
                </CardTitle>
                <CardDescription className="text-xs">
                  Cross-reference local service ticket logs with billing and lease contract invoice
                  history.
                </CardDescription>
              </div>
              <div className="w-64">
                <SearchableSelect
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.id.substring(0, 8)})`,
                    description: c.email || c.phone || undefined,
                  }))}
                  value={selectedIntelCustomer}
                  onValueChange={(val) => {
                    setSelectedIntelCustomer(val);
                    loadCustomerIntel(val);
                  }}
                  placeholder="Search customer by name or ID..."
                  className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {loadingIntel ? (
                <div className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <span className="text-xs text-slate-400 mt-2 block font-medium">
                    Loading intel history...
                  </span>
                </div>
              ) : !selectedIntelCustomer ? (
                <div className="text-center py-20 text-slate-400 text-xs font-semibold">
                  Please select a customer from the dropdown above to pull intel history.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ServiceTicketHistoryPanel tickets={intelData?.tickets} />
                  <BillingHistoryPanel
                    billingHistory={intelData?.billingHistory}
                    tickets={intelData?.tickets}
                  />
                </div>
              )}
            </CardContent>
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end">
              <Button
                type="button"
                onClick={() => setShowIntelModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Close Intel View
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TICKET DETAILS MODAL */}
      <DetailDialog
        isOpen={showDetailsModal && selectedTicket !== null}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTicket(null);
        }}
        title="Service Ticket Details"
        maxWidth="4xl"
        contentClassName="mt-2"
      >
        {selectedTicket &&
          (() => {
            const customer = customers.find((c) => c.id === selectedTicket.customerId);
            const technician = technicians.find(
              (t) => t.id === selectedTicket.assignedTechnicianId,
            );

            return (
              <div className="space-y-4 text-slate-800">
                {/* TABS SELECTOR */}
                <div className="flex border-b border-slate-200 gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('info')}
                    className={`pb-2 px-2 text-xs font-bold transition-all relative ${activeDetailTab === 'info' ? 'text-primary font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Ticket Details
                    {activeDetailTab === 'info' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailTab('revisions');
                      fetchTicketRevisions(selectedTicket.id);
                    }}
                    className={`pb-2 px-2 text-xs font-bold transition-all relative ${activeDetailTab === 'revisions' ? 'text-primary font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Revision History
                    {activeDetailTab === 'revisions' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded" />
                    )}
                  </button>
                </div>

                {activeDetailTab === 'info' ? (
                  <>
                    {/* TOP HEADER SECTION */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Service Ticket
                          </span>
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {selectedTicket.jobType}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 font-mono">
                          {selectedTicket.ticketNumber}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={selectedTicket.status} />
                        <Badge context={selectedTicket.serviceContext} />
                      </div>
                    </div>

                    {/* CORE INFO GRID (4 Columns side-by-side) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Visit Date */}
                      <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-2.5 shadow-sm min-w-0">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                          <Calendar size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Scheduled Visit
                          </span>
                          <span className="text-xs font-semibold text-slate-800 block truncate">
                            {selectedTicket.scheduledVisitDate
                              ? new Date(selectedTicket.scheduledVisitDate).toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  },
                                )
                              : 'Unscheduled'}
                          </span>
                        </div>
                      </div>

                      {/* Technician */}
                      <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-2.5 shadow-sm min-w-0">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                          <Wrench size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Assigned Technician
                          </span>
                          <span className="text-xs font-semibold text-slate-800 block truncate">
                            {technician
                              ? `${technician.first_name || ''} ${technician.last_name || ''}`.trim()
                              : 'Not Assigned'}
                          </span>
                        </div>
                      </div>

                      {/* Customer Info Card */}
                      <div className="border border-slate-200/60 rounded-xl p-3 space-y-1.5 bg-white shadow-sm min-w-0">
                        <div className="flex items-center gap-1.5 border-b border-slate-50 pb-1">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Customer Info
                          </h4>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <a
                            href={`/employee/customers/${customer?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-xs block truncate"
                          >
                            {customer ? customer.name : 'Unknown Customer'}
                          </a>
                          {customer?.email && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
                              <Mail size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                          {customer?.phone && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Phone size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Machine Details Card */}
                      <div className="border border-slate-200/60 rounded-xl p-3 space-y-1.5 bg-white shadow-sm min-w-0">
                        <div className="flex items-center gap-1.5 border-b border-slate-50 pb-1">
                          <Laptop size={14} className="text-slate-400 shrink-0" />
                          <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Machine Details
                          </h4>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-slate-800 text-xs block truncate">
                            {formatMachineName(
                              selectedTicket.productBrand,
                              selectedTicket.productModel,
                              selectedTicket.productName,
                            )}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedTicket.serialNumber) {
                                  setShowDetailsModal(false);
                                  handleOpenMachineIntel(selectedTicket.serialNumber);
                                }
                              }}
                              className="text-[10px] font-mono font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 text-blue-600 hover:text-blue-800 transition-colors focus:outline-none truncate"
                            >
                              SN: {selectedTicket.serialNumber || 'N/A'} (View)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NOTES / DESCRIPTIONS CALLOUTS (3 Columns side-by-side) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Issue Description */}
                      <div className="bg-amber-50/45 border border-amber-200/50 rounded-xl p-3 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                          <FileText size={12} />
                          <span>Issue Description</span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {selectedTicket.issueDescription || 'No description provided.'}
                        </p>
                      </div>

                      {/* Diagnosis Notes */}
                      <div className="bg-purple-50/45 border border-purple-200/50 rounded-xl p-3 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1 text-purple-800 font-bold text-[10px] uppercase tracking-wider">
                          <Activity size={12} />
                          <span>Diagnosis Notes</span>
                        </div>
                        {selectedTicket.diagnosisNotes ? (
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {selectedTicket.diagnosisNotes}
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Not yet submitted
                          </span>
                        )}
                      </div>

                      {/* Completion Notes */}
                      <div className="bg-emerald-50/45 border border-emerald-200/50 rounded-xl p-3 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 size={12} />
                          <span>Completion Notes</span>
                        </div>
                        {selectedTicket.completionNotes ? (
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {selectedTicket.completionNotes}
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Not yet completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items & Spare Parts Used */}
                    {selectedTicket.items && selectedTicket.items.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Spare Parts / Items Used
                        </h4>
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow>
                                <TableHead className="h-8 text-[10px] font-bold text-slate-500 py-1 px-2">
                                  Part Name
                                </TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-slate-500 py-1 text-center px-2">
                                  Qty
                                </TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-slate-500 py-1 text-right px-2">
                                  Unit Price
                                </TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-slate-500 py-1 text-right px-2">
                                  Total
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedTicket.items.map((item, index: number) => (
                                <TableRow key={item.id || index} className="hover:bg-slate-50/20">
                                  <TableCell className="py-1 px-2 text-xs font-semibold text-slate-700">
                                    {item.partName}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-xs text-slate-600 text-center">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-xs text-slate-600 text-right">
                                    {getActiveCurrency()}{' '}
                                    {item.unitPrice.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </TableCell>
                                  <TableCell className="py-1 px-2 text-xs font-bold text-slate-700 text-right">
                                    {item.isFree ? (
                                      <span className="text-emerald-600 font-bold text-[10px] uppercase">
                                        FOC
                                      </span>
                                    ) : (
                                      `${getActiveCurrency()} ${item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Action buttons relevant to current status */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      {selectedTicket.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-lg font-bold gap-1 mr-auto"
                          onClick={async () => {
                            try {
                              const blob = await downloadServiceReport(selectedTicket.id);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Service_Report_${selectedTicket.ticketNumber}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                              toastSuccess('PDF Report downloaded successfully!');
                            } catch (err) {
                              console.error(err);
                              toastError('Failed to download PDF Report.');
                            }
                          }}
                        >
                          <FileText className="size-3.5" />
                          Download PDF Report
                        </Button>
                      )}

                      {(isHelpDesk || isManagerOrAdmin) &&
                        !['COMPLETED', 'CANCELLED'].includes(selectedTicket.status) && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-[#1e3a8a] text-white h-8 px-3 rounded-lg font-bold gap-1"
                            onClick={() => {
                              setAssignForm({
                                technicianId: selectedTicket.assignedTechnicianId || '',
                              });
                              setShowDetailsModal(false);
                              setShowAssignModal(true);
                            }}
                          >
                            <UserPlus className="size-3.5" />
                            {selectedTicket.assignedTechnicianId ? 'Change Tech' : 'Assign Tech'}
                          </Button>
                        )}

                      {isTechnician &&
                        selectedTicket.status === 'ASSIGNED' &&
                        !selectedTicket.diagnosisStartedAt && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg font-bold gap-1"
                            onClick={() => {
                              setShowDetailsModal(false);
                              setArrivalDialog({
                                ticketId: selectedTicket.id,
                                ticketNo: selectedTicket.ticketNumber,
                                location: selectedTicket.serviceLocation,
                              });
                            }}
                          >
                            <Play className="size-3.5 fill-current" />
                            Start Diagnosis
                          </Button>
                        )}

                      {isTechnician &&
                        selectedTicket.status === 'ASSIGNED' &&
                        selectedTicket.diagnosisStartedAt && (
                          <div className="flex items-center gap-1.5">
                            <ActiveTimer startTime={selectedTicket.diagnosisStartedAt.toString()} />
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-3 rounded-lg font-bold"
                              onClick={() => {
                                setShowDetailsModal(false);
                                loadCashBankAccounts(selectedTicket.branchId);
                                setDiagnosisForm({
                                  notes: '',
                                  problemFound: '',
                                  rootCause: '',
                                  meterReading: 0,
                                  labourCost: 0,
                                  visitChargeAmount: 0,
                                  visitChargeMethod: 'ADDED_TO_ESTIMATE',
                                  visitChargeCollected: true,
                                  visitChargePaymentMode: '',
                                  visitChargeAccountId: '',
                                  transportChargeAmount: 0,
                                  discountAmount: 0,
                                  technicianNoteToFinance: '',
                                  items: [],
                                });
                                setShowDiagnoseModal(true);
                              }}
                            >
                              Diagnose
                            </Button>
                          </div>
                        )}

                      {!isHelpDesk &&
                        (selectedTicket.status === 'DIAGNOSED' ||
                          selectedTicket.status === 'WAITING_FINANCE_APPROVAL' ||
                          selectedTicket.status === 'FINANCE_APPROVED' ||
                          selectedTicket.status === 'QUOTED' ||
                          selectedTicket.status === 'FINANCE_REJECTED' ||
                          selectedTicket.status === 'CUSTOMER_APPROVED' ||
                          selectedTicket.status === 'CUSTOMER_REJECTED') && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3 rounded-lg font-bold"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleOpenEstimates(selectedTicket);
                            }}
                          >
                            Estimates
                          </Button>
                        )}

                      {isTechnician &&
                        (selectedTicket.status === 'CUSTOMER_APPROVED' ||
                          selectedTicket.status === 'FREE_SERVICE') &&
                        selectedTicket.assignedTechnicianId === user?.userId &&
                        !selectedTicket.repairStartedAt && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg font-bold gap-1"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleStartRepair(selectedTicket.id);
                            }}
                          >
                            <Play className="size-3.5 fill-current" />
                            Start Repair
                          </Button>
                        )}

                      {isTechnician &&
                        selectedTicket.status === 'IN_PROGRESS' &&
                        selectedTicket.repairStartedAt &&
                        !selectedTicket.repairPausedAt && (
                          <div className="flex items-center gap-1.5">
                            <ActiveTimer startTime={selectedTicket.repairStartedAt.toString()} />
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-600 hover:bg-amber-50 h-8 px-3 rounded-lg font-bold gap-1"
                              onClick={() => handlePauseRepair(selectedTicket.id)}
                            >
                              <Pause className="size-3.5" />
                              Pause
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg font-bold"
                              onClick={() => {
                                setShowDetailsModal(false);
                                setCompleteForm({
                                  workPerformed: '',
                                  resolutionDetails: '',
                                  meterReading: 0,
                                  customerRemarks: '',
                                  technicianRemarks: '',
                                  customerSignature: 'Customer Signed',
                                  technicianSignature: 'Technician Signed',
                                });
                                setCompletionNotes('');
                                setShowCompleteModal(true);
                              }}
                            >
                              Complete Job
                            </Button>
                          </div>
                        )}

                      {isTechnician &&
                        selectedTicket.status === 'IN_PROGRESS' &&
                        selectedTicket.repairStartedAt &&
                        selectedTicket.repairPausedAt && (
                          <div className="flex items-center gap-1.5">
                            <PausedTimer
                              startTime={selectedTicket.repairStartedAt.toString()}
                              pausedAt={selectedTicket.repairPausedAt.toString()}
                              pausedDurationMinutes={selectedTicket.repairPausedDurationMinutes}
                            />
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-lg font-bold gap-1"
                              onClick={() => handleResumeRepair(selectedTicket.id)}
                            >
                              <Play className="size-3.5 fill-current" />
                              Resume
                            </Button>
                          </div>
                        )}

                      {isManagerOrAdmin &&
                        selectedTicket.status !== 'COMPLETED' &&
                        selectedTicket.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-3 rounded-lg font-bold"
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleCancelTicketClick(
                                selectedTicket.id,
                                selectedTicket.ticketNumber,
                              );
                            }}
                          >
                            Cancel Ticket
                          </Button>
                        )}

                      {(selectedTicket.status === 'QUOTED' ||
                        selectedTicket.status === 'CUSTOMER_APPROVED') && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg font-bold flex items-center gap-1"
                          onClick={() => {
                            setShareTicket(selectedTicket);
                            setShareDocType('quotation');
                            setShareModalOpen(true);
                          }}
                        >
                          <Send className="size-3" />
                          Share Quotation
                        </Button>
                      )}

                      {selectedTicket.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg font-bold flex items-center gap-1"
                          onClick={() => {
                            setShareTicket(selectedTicket);
                            setShareDocType('completion-bill');
                            setShareModalOpen(true);
                          }}
                        >
                          <Send className="size-3" />
                          Share Bill
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSelectedTicket(null);
                          setActiveDetailTab('info');
                          setTicketRevisions([]);
                        }}
                        className="text-slate-500 border-slate-300 hover:bg-slate-50 h-8 px-3 rounded-lg font-bold"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Estimate Revision History
                    </h4>

                    {loadingRevisions ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Loading
                        revision history...
                      </div>
                    ) : ticketRevisions.length === 0 ? (
                      <div className="text-xs text-slate-400 bg-slate-50 p-6 rounded-xl border border-slate-100 italic text-center">
                        No revisions recorded for this ticket estimate.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                        {ticketRevisions.map((rev) => (
                          <div
                            key={rev.id}
                            className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Revision #{rev.revisionNumber} ({rev.revisionType || 'REVISION'})
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  rev.financeDecision === 'APPROVED'
                                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                    : rev.financeDecision === 'REJECTED'
                                      ? 'border-red-200 text-red-700 bg-red-50'
                                      : 'border-amber-200 text-amber-700 bg-amber-50'
                                }`}
                              >
                                {rev.financeDecision || 'PENDING'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-slate-400 block font-bold">Total Amount</span>
                                <span className="font-semibold text-slate-900">
                                  {getActiveCurrency()} {Number(rev.totalAmount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-bold">
                                  Discount Applied
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {getActiveCurrency()}{' '}
                                  {Number(rev.discountApplied || 0).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-bold">Visit Charge</span>
                                <span className="font-semibold text-slate-900">
                                  {getActiveCurrency()}{' '}
                                  {Number(rev.visitChargeAmount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-bold">Submitted At</span>
                                <span className="font-semibold text-slate-900">
                                  {rev.submittedAt
                                    ? new Date(rev.submittedAt).toLocaleDateString()
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {rev.technicianNoteToFinance && (
                              <div className="text-[11px] bg-indigo-50/50 border border-indigo-100/60 p-2.5 rounded-lg">
                                <span className="font-bold text-indigo-900 block mb-0.5">
                                  Technician Note to Finance:
                                </span>
                                <p className="text-slate-700 leading-relaxed">
                                  {rev.technicianNoteToFinance}
                                </p>
                              </div>
                            )}

                            {rev.financeDecisionNote && (
                              <div className="text-[11px] bg-red-50/50 border border-red-100/60 p-2.5 rounded-lg">
                                <span className="font-bold text-red-900 block mb-0.5">
                                  Finance Decision Note:
                                </span>
                                <p className="text-slate-700 leading-relaxed">
                                  {rev.financeDecisionNote}
                                </p>
                              </div>
                            )}

                            {rev.itemsSnapshot && Object.keys(rev.itemsSnapshot).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Items Snapshot
                                </span>
                                <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                                  <table className="w-full text-[10px] text-left text-slate-500">
                                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold">
                                      <tr>
                                        <th className="px-3 py-1.5">Description</th>
                                        <th className="px-3 py-1.5 text-center">Qty</th>
                                        <th className="px-3 py-1.5 text-right">Unit Price</th>
                                        <th className="px-3 py-1.5 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {Array.isArray(rev.itemsSnapshot)
                                        ? (
                                            rev.itemsSnapshot as {
                                              partName?: string;
                                              description?: string;
                                              quantity?: number;
                                              unitPrice?: number;
                                              isFree?: boolean;
                                            }[]
                                          ).map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="px-3 py-1 font-medium text-slate-700">
                                                {item.partName || item.description || 'Spare Part'}
                                              </td>
                                              <td className="px-3 py-1 text-center">
                                                {item.quantity}
                                              </td>
                                              <td className="px-3 py-1 text-right">
                                                {getActiveCurrency()}{' '}
                                                {Number(item.unitPrice || 0).toFixed(2)}
                                              </td>
                                              <td className="px-3 py-1 text-right font-bold text-slate-700">
                                                {item.isFree
                                                  ? 'FOC'
                                                  : `${getActiveCurrency()} ${(Number(item.unitPrice || 0) * Number(item.quantity || 1)).toFixed(2)}`}
                                              </td>
                                            </tr>
                                          ))
                                        : (
                                            Object.values(rev.itemsSnapshot) as {
                                              partName?: string;
                                              description?: string;
                                              quantity?: number;
                                              unitPrice?: number;
                                              isFree?: boolean;
                                            }[]
                                          ).map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="px-3 py-1 font-medium text-slate-700">
                                                {item.partName || item.description || 'Spare Part'}
                                              </td>
                                              <td className="px-3 py-1 text-center">
                                                {item.quantity}
                                              </td>
                                              <td className="px-3 py-1 text-right">
                                                {getActiveCurrency()}{' '}
                                                {Number(item.unitPrice || 0).toFixed(2)}
                                              </td>
                                              <td className="px-3 py-1 text-right font-bold text-slate-700">
                                                {item.isFree
                                                  ? 'FOC'
                                                  : `${getActiveCurrency()} ${(Number(item.unitPrice || 0) * Number(item.quantity || 1)).toFixed(2)}`}
                                              </td>
                                            </tr>
                                          ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSelectedTicket(null);
                          setActiveDetailTab('info');
                          setTicketRevisions([]);
                        }}
                        className="text-slate-500 border-slate-300 hover:bg-slate-50 h-8 px-3 rounded-lg font-bold"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </DetailDialog>

      {shareTicket &&
        (() => {
          const customer = customers.find((c) => c.id === shareTicket.customerId);
          return (
            <SendDocumentModal
              open={shareModalOpen}
              onOpenChange={setShareModalOpen}
              ticketId={shareTicket.id}
              ticketNumber={shareTicket.ticketNumber}
              docType={shareDocType}
              initialEmail={customer?.email || ''}
              initialPhone={customer?.phone || ''}
              customerName={customer ? customer.name : 'Customer'}
            />
          );
        })()}

      {/* ESTIMATES AND REVISIONS WORKFLOW MODAL */}
      {showEstimatesModal && selectedTicket && estimatesData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="text-primary" size={18} /> Cost Estimates & Revisions
                  Workflow
                </CardTitle>
                <CardDescription className="text-xs">
                  Ticket #{selectedTicket.ticketNumber} | Context:{' '}
                  <span className="font-bold text-slate-700">{selectedTicket.serviceContext}</span>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEstimatesModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Full-width Ticket Details Section */}
              <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="text-primary size-4" /> Service Ticket Context & Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-3">
                    <span className="text-slate-500 font-medium block">Complaint Registered:</span>
                    <p className="text-slate-800 mt-1 bg-white p-2.5 rounded-lg border border-slate-200/60 leading-relaxed font-medium">
                      {selectedTicket.issueDescription || 'No complaint details provided.'}
                    </p>
                  </div>

                  {selectedTicket.problemFound && (
                    <div>
                      <span className="text-slate-500 font-medium block">Problem Found:</span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/60 block mt-1">
                        {selectedTicket.problemFound}
                      </span>
                    </div>
                  )}

                  {selectedTicket.rootCause && (
                    <div>
                      <span className="text-slate-500 font-medium block">Root Cause:</span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/60 block mt-1">
                        {selectedTicket.rootCause}
                      </span>
                    </div>
                  )}

                  {selectedTicket.meterReadingAtCreation !== undefined && (
                    <div>
                      <span className="text-slate-500 font-medium block">
                        Meter Reading (at Ticket Creation):
                      </span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/60 block mt-1 font-mono">
                        {selectedTicket.meterReadingAtCreation}
                      </span>
                    </div>
                  )}

                  {selectedTicket.meterReadingAtService !== undefined && (
                    <div>
                      <span className="text-slate-500 font-medium block">
                        Meter Reading (at Service):
                      </span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/60 block mt-1 font-mono">
                        {selectedTicket.meterReadingAtService}
                      </span>
                    </div>
                  )}

                  {(selectedTicket.diagnosisNotes || selectedTicket.technicianNoteToFinance) && (
                    <div className="md:col-span-3 space-y-3">
                      {selectedTicket.diagnosisNotes && (
                        <div>
                          <span className="text-slate-500 font-medium block">
                            Technician Diagnosis Notes:
                          </span>
                          <p className="text-slate-700 mt-1 bg-white p-2.5 rounded-lg border border-slate-200/60 whitespace-pre-wrap">
                            {selectedTicket.diagnosisNotes}
                          </p>
                        </div>
                      )}
                      {selectedTicket.technicianNoteToFinance && (
                        <div>
                          <span className="text-amber-800 font-bold block flex items-center gap-1">
                            📝 Note to Finance:
                          </span>
                          <p className="text-amber-900 mt-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 font-medium whitespace-pre-wrap font-sans">
                            {selectedTicket.technicianNoteToFinance}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Left Column: Existing Estimates & Revisions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Approval Timeline & History
                </h3>

                {(() => {
                  const sortedRevs = [...estimatesData.revisions].sort(
                    (a, b) => b.version - a.version,
                  );
                  const latestRev = sortedRevs[0];
                  const isExpired =
                    latestRev &&
                    latestRev.validUntil &&
                    new Date(latestRev.validUntil) < new Date();

                  if (!isExpired) return null;

                  return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-red-600 animate-pulse" />{' '}
                          Estimate Validity Expired
                        </span>
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                          Expired
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed">
                        The estimate validity expired on{' '}
                        <span className="font-bold text-red-700">
                          {new Date(latestRev.validUntil!).toLocaleDateString()}
                        </span>
                        . Finance approval is required to extend validity.
                      </p>
                      {canManageFinance && (
                        <div className="space-y-2 pt-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">
                            Set New Validity Date
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              className="h-8 text-xs bg-white border-slate-200 rounded-lg"
                              id="extendValidityDate"
                            />
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white text-[11px] h-8 px-3 rounded-lg shrink-0"
                              onClick={async () => {
                                const inputEl = document.getElementById(
                                  'extendValidityDate',
                                ) as HTMLInputElement;
                                if (!inputEl || !inputEl.value) {
                                  toastError('Please select a valid date');
                                  return;
                                }
                                try {
                                  setSubmitting(true);
                                  await extendTicketValidity(selectedTicket.id, inputEl.value);
                                  await fetchEstimates(selectedTicket.id);
                                  await fetchInitialData();
                                  toastSuccess('Validity extended successfully!');
                                } catch (err) {
                                  console.error(err);
                                  toastError('Failed to extend validity.');
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                            >
                              Extend Validity
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {estimatesData.estimates.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                    No cost estimates registered yet. Submit labor and parts below.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Baseline Estimates */}
                    {estimatesData.estimates.map((est) => (
                      <div
                        key={est.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Baseline Estimate (v{est.version})
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
                            {est.status}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-slate-600">
                          <p>
                            Labor Cost:{' '}
                            <span className="font-semibold text-slate-800">
                              {getActiveCurrency()} {Number(est.labourCost || 0).toFixed(2)}
                            </span>
                          </p>
                          <p>
                            Parts/Items Cost:{' '}
                            <span className="font-semibold text-slate-800">
                              {getActiveCurrency()} {Number(est.partsCost || 0).toFixed(2)}
                            </span>
                          </p>
                          {Number(est.transportChargeAmount || 0) > 0 && (
                            <p>
                              Transportation Charge:{' '}
                              <span className="font-semibold text-slate-800">
                                {getActiveCurrency()}{' '}
                                {Number(est.transportChargeAmount || 0).toFixed(2)}
                              </span>
                            </p>
                          )}
                          {Number(est.visitChargeAmount || 0) > 0 && (
                            <p>
                              Visit Charge:{' '}
                              <span className="font-semibold text-slate-800">
                                {getActiveCurrency()}{' '}
                                {Number(est.visitChargeAmount || 0).toFixed(2)}
                              </span>
                            </p>
                          )}
                          {Number(est.discountAmount || 0) > 0 && (
                            <p>
                              Discount:{' '}
                              <span className="font-semibold text-red-600">
                                -{getActiveCurrency()} {Number(est.discountAmount || 0).toFixed(2)}
                              </span>
                            </p>
                          )}
                          <p>
                            Total Cost:{' '}
                            <span className="font-bold text-slate-900 text-sm">
                              {getActiveCurrency()} {Number(est.totalCost || 0).toFixed(2)}
                            </span>
                          </p>
                        </div>

                        {/* Items List */}
                        {est.items && est.items.length > 0 && (
                          <div className="bg-white border border-slate-100 rounded-lg p-2 text-[11px] space-y-1">
                            <span className="font-bold text-slate-500 block mb-1">
                              Declared Parts:
                            </span>
                            {est.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-slate-600 border-b border-slate-50 pb-0.5 last:border-b-0"
                              >
                                <span>
                                  {item.partName} x {item.quantity}
                                </span>
                                <span className="font-mono">
                                  {getActiveCurrency()}{' '}
                                  {(item.unitPrice * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Internal Finance Action Triggers */}
                        {est.status === 'WAITING_FINANCE_APPROVAL' && (
                          <div className="flex gap-2 pt-1.5">
                            {canManageFinance ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-8 px-3 rounded-lg"
                                  onClick={() => handleApproveFinance(est.id)}
                                >
                                  Approve (Finance)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-[11px] h-8 px-3 rounded-lg"
                                  onClick={() => {
                                    const note = prompt(
                                      'Please enter a rejection note to the technician (Required):',
                                    );
                                    if (!note || !note.trim()) {
                                      alert('Rejection note is required.');
                                      return;
                                    }
                                    handleRejectFinance(est.id, note);
                                  }}
                                >
                                  Reject (Finance)
                                </Button>
                              </>
                            ) : (
                              <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-100 flex items-center gap-1.5">
                                <span>⏳ Estimate submitted to Finance. Awaiting approval.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Customer Action Triggers — TECHNICIAN, HELP_DESK, and MANAGER/ADMIN */}
                        {est.status === 'FINANCE_APPROVED' &&
                          (isHelpDesk || isTechnician || isManagerOrAdmin) && (
                            <div className="flex gap-2 pt-1.5 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                              <span className="text-[10px] text-yellow-800 font-bold block mb-1 w-full">
                                Customer Action:
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-8 px-3 rounded-lg"
                                  onClick={() => handleApproveCustomer(est.id)}
                                >
                                  Approve (Customer)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-[11px] h-8 px-3 rounded-lg"
                                  onClick={() => {
                                    const eligible = !!(
                                      selectedTicket &&
                                      isVisitChargeCollectionEligible(selectedTicket)
                                    );
                                    setRejectCollect(eligible);
                                    setRejectPaymentMode('');
                                    setRejectAccountId('');
                                    setRejectReason('');
                                    setRejectDiscountAmount('');
                                    if (eligible && selectedTicket)
                                      loadCashBankAccounts(selectedTicket.branchId);
                                    setRejectVCModal({
                                      kind: 'estimate',
                                      estimateId: est.id,
                                      amount: Number(selectedTicket?.visitChargeAmount) || 0,
                                      eligible,
                                    });
                                  }}
                                >
                                  Reject (Customer)
                                </Button>
                              </div>
                            </div>
                          )}

                        {/* Submit draft option */}
                        {est.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white text-[11px] h-8 px-3 rounded-lg w-full mt-1.5"
                            onClick={() => handleSubmitEstimate(selectedTicket.id)}
                          >
                            Submit to Finance for Approval
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Revisions list */}
                    {estimatesData.revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="bg-purple-50/55 border border-purple-200 rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-800">
                            Estimate Revision (v{rev.version})
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-300 text-purple-700 bg-purple-50">
                            {rev.status}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-slate-600">
                          <p>
                            Additional Labor:{' '}
                            <span className="font-semibold text-slate-800">
                              {getActiveCurrency()} {Number(rev.labourCost || 0).toFixed(2)}
                            </span>
                          </p>
                          <p>
                            Additional Parts:{' '}
                            <span className="font-semibold text-slate-800">
                              {getActiveCurrency()}{' '}
                              {Number(rev.partsCost ?? rev.totalCost - rev.labourCost).toFixed(2)}
                            </span>
                          </p>
                          <p>
                            Additional Total:{' '}
                            <span className="font-bold text-slate-900">
                              {getActiveCurrency()} {Number(rev.totalCost || 0).toFixed(2)}
                            </span>
                          </p>
                        </div>

                        {rev.items && rev.items.length > 0 && (
                          <div className="bg-white border border-slate-100 rounded-lg p-2 text-[11px] space-y-1">
                            <span className="font-bold text-slate-500 block mb-1">
                              Additional Parts:
                            </span>
                            {rev.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-slate-600">
                                <span>
                                  {item.partName} x {item.quantity}
                                </span>
                                <span className="font-mono">
                                  {getActiveCurrency()}{' '}
                                  {(item.unitPrice * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Revision Approvals */}
                        {rev.status === 'WAITING_FINANCE_APPROVAL' && (
                          <div className="flex gap-2 pt-1.5">
                            {canManageFinance ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-8 px-3 rounded-lg"
                                onClick={() => handleApproveRevisionFinance(rev.id)}
                              >
                                Approve Finance (Rev)
                              </Button>
                            ) : (
                              <div className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-100 flex items-center gap-1.5">
                                <span>⏳ Estimate submitted to Finance. Awaiting approval.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {rev.status === 'FINANCE_APPROVED' && (
                          <div className="flex gap-2 pt-1.5">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-8 px-3 rounded-lg"
                              onClick={() => handleApproveRevisionCustomer(rev.id)}
                            >
                              Approve Customer (Rev)
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic Form to Create / Revise */}
              <div className="border-l border-slate-100 pl-6 space-y-6">
                {/* Check if baseline is customer approved, in which case we allow a revision */}
                {estimatesData.estimates.some((e) => e.status === 'CUSTOMER_APPROVED') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Create Estimate Revision
                      </h3>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Baseline Approved
                      </span>
                    </div>

                    <form onSubmit={handleCreateRevision} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Additional Labor Cost ({getActiveCurrency()})
                        </label>
                        <Input
                          type="number"
                          required
                          min={0}
                          value={newRevLabour || ''}
                          onChange={(e) => setNewRevLabour(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Additional Parts required
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addRevisionItem}
                            className="text-[10px] h-7 px-2.5 rounded-lg border-slate-200 text-primary gap-1"
                          >
                            <Plus size={10} /> Add Part
                          </Button>
                        </div>

                        {newRevItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2"
                          >
                            <SearchableSelect
                              options={spareParts.map((sp) => ({
                                value: sp.id,
                                label: `${sp.part_name} (${sp.sku})`,
                                description: `Price: ${getActiveCurrency()} ${sp.base_price.toFixed(2)}`,
                              }))}
                              value={item.sparePartId}
                              onValueChange={(val) => updateRevisionItem(idx, 'sparePartId', val)}
                              placeholder="Select spare part..."
                              className="h-8 text-[11px] w-full"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                required
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateRevisionItem(
                                    idx,
                                    'quantity',
                                    parseInt(e.target.value, 10) || 1,
                                  )
                                }
                                className="h-8 text-[11px] bg-white"
                                placeholder="Qty"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRevisionItem(idx)}
                                className="text-red-500 text-[10px] h-8"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs py-2.5"
                      >
                        {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Submit
                        Revision for Approval
                      </Button>
                    </form>
                  </div>
                ) : estimatesData.estimates.length === 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Create Draft Estimate
                    </h3>
                    <form onSubmit={handleCreateEstimate} className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Labor / Service Charge ({getActiveCurrency()})
                        </label>
                        <Input
                          type="number"
                          required
                          min={0}
                          value={newEstLabour || ''}
                          onChange={(e) => setNewEstLabour(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Parts / Items Required
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEstimateItem}
                            className="text-[10px] h-7 px-2.5 rounded-lg border-slate-200 text-primary gap-1"
                          >
                            <Plus size={10} /> Add Part
                          </Button>
                        </div>

                        {newEstItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2"
                          >
                            <SearchableSelect
                              options={spareParts.map((sp) => ({
                                value: sp.id,
                                label: `${sp.part_name} (${sp.sku})`,
                                description: `Price: ${getActiveCurrency()} ${sp.base_price.toFixed(2)}`,
                              }))}
                              value={item.sparePartId}
                              onValueChange={(val) => updateEstimateItem(idx, 'sparePartId', val)}
                              placeholder="Select spare part..."
                              className="h-8 text-[11px] w-full"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                required
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateEstimateItem(
                                    idx,
                                    'quantity',
                                    parseInt(e.target.value, 10) || 1,
                                  )
                                }
                                className="h-8 text-[11px] bg-white"
                                placeholder="Qty"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEstimateItem(idx)}
                                className="text-red-500 text-[10px] h-8"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs py-2.5"
                      >
                        {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Create
                        Draft Estimate
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-6 text-center italic">
                    Estimate exists. Please wait for customer/finance approval before creating any
                    revisions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MACHINE HISTORICAL INTEL & YIELD ANALYTICS MODAL */}
      {showMachineIntelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="text-primary" size={18} /> Machine History & Consumable Yield
                  Intel
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Serial Number: {selectedMachineSerial}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMachineIntelModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
              {loadingMachineIntel ? (
                <div className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <span className="text-xs text-slate-400 mt-2 block font-medium">
                    Loading machine intel history...
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Total Repair Visits
                      </span>
                      <span className="text-xl font-black text-slate-800">
                        {machineCostData?.totalServiceVisits || 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 shadow-sm text-center bg-emerald-50/50 border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                        Current Meter Reading
                      </span>
                      <span className="text-xl font-black text-emerald-900 font-mono">
                        {machineCostData?.currentMeterReading != null
                          ? machineCostData.currentMeterReading
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Total Spare Parts Cost
                      </span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {getActiveCurrency()}{' '}
                        {(machineCostData?.totalSparePartsCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Total Labor Cost
                      </span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {getActiveCurrency()} {(machineCostData?.totalLabourCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 shadow-sm text-center bg-blue-50/50 border-blue-100">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                        Total Lifetime Cost
                      </span>
                      <span className="text-xl font-black text-blue-900 font-mono">
                        {getActiveCurrency()} {(machineCostData?.totalLifetimeCost || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveIntelTab('visits')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                        activeIntelTab === 'visits'
                          ? 'border-primary text-primary font-black'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Service Visits ({machineCostData?.visitLogs?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIntelTab('parts')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                        activeIntelTab === 'parts'
                          ? 'border-primary text-primary font-black'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Consumed Parts ({machinePartLogs?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIntelTab('yields')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                        activeIntelTab === 'yields'
                          ? 'border-primary text-primary font-black'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Toner Yield Analytics ({machineYieldData?.length || 0})
                    </button>
                  </div>

                  <div className="pt-2">
                    {/* Machine Visit History Logs */}
                    {activeIntelTab === 'visits' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Historical Service Visits
                        </h3>
                        {!machineCostData?.visitLogs || machineCostData.visitLogs.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                            No service visits logged for this machine.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {machineCostData.visitLogs.map((log, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-700">
                                    {log.ticketNumber} | {log.serviceContext}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(log.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <Badge
                                  className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(log.status)}`}
                                >
                                  {log.status}
                                </Badge>
                                <p className="text-xs text-slate-600">
                                  Meter Reading:{' '}
                                  <span className="font-semibold">{log.meterReading || 'N/A'}</span>
                                </p>
                                <p className="text-xs text-slate-600">
                                  Total Cost:{' '}
                                  <span className="font-bold text-slate-800">
                                    {getActiveCurrency()} {log.cost.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consumed Parts Log */}
                    {activeIntelTab === 'parts' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Consumed Parts & Consumables Log
                        </h3>
                        {!machinePartLogs || machinePartLogs.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                            No spare parts or consumables replaced yet.
                          </p>
                        ) : (
                          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold">
                                    Part Name / SKU
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-center">
                                    Type
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-center">
                                    Qty
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-right">
                                    Cost ({getActiveCurrency()})
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-center">
                                    Replaced At
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {machinePartLogs.map(
                                  (log: MachineHistoryResponse['partLogs'][number]) => (
                                    <TableRow key={log.id} className="hover:bg-slate-50/30">
                                      <TableCell className="py-2.5 text-xs font-semibold text-slate-700">
                                        {log.partName} {log.sku ? `(${log.sku})` : ''}
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] ${log.isConsumable ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                                        >
                                          {log.isConsumable ? 'Consumable' : 'Spare Part'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-center font-mono font-bold">
                                        {log.quantityUsed}
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-right font-mono font-bold">
                                        {Number(log.totalCost).toFixed(2)}
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-center text-slate-500">
                                        {new Date(log.replacedAt).toLocaleDateString()}
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consumable Yield Performance Log */}
                    {activeIntelTab === 'yields' && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Consumable Yield Tracking Logs
                        </h3>
                        {machineYieldData.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                            No consumable yield events recorded for this machine.
                          </p>
                        ) : (
                          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold">
                                    Consumable SKU
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-right">
                                    Yield (Pages)
                                  </TableHead>
                                  <TableHead className="text-[10px] py-2 h-8 font-bold text-center">
                                    Efficiency
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {machineYieldData.map((y, idx) => {
                                  const target = y.targetYield || 10000;
                                  const actual = y.actualYield || 0;
                                  const yieldPct = Math.min(
                                    200,
                                    Math.round((actual / target) * 100),
                                  );
                                  return (
                                    <TableRow key={y.id || idx} className="hover:bg-slate-50/30">
                                      <TableCell className="py-2.5 text-xs font-semibold text-slate-700">
                                        {y.consumableSku}
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-slate-600 text-right font-mono font-bold">
                                        {actual.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="py-2.5 text-xs text-center font-bold">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] ${yieldPct >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
                                        >
                                          {yieldPct}%
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmConfig?.title || ''}
        description={confirmConfig?.description || ''}
        type={confirmConfig?.type || 'neutral'}
        confirmText={confirmConfig?.confirmText}
        onConfirm={async () => {
          if (confirmConfig?.onConfirm) {
            await confirmConfig.onConfirm();
          }
          setConfirmOpen(false);
        }}
      />

      <ArrivalDiagnosisDialog
        isOpen={!!arrivalDialog}
        onClose={() => setArrivalDialog(null)}
        ticketNo={arrivalDialog?.ticketNo}
        location={arrivalDialog?.location}
        isLoading={startingDiagnosis}
        onStart={async () => {
          if (!arrivalDialog) return;
          setStartingDiagnosis(true);
          try {
            await handleStartDiagnosis(arrivalDialog.ticketId);
            setArrivalDialog(null);
          } finally {
            setStartingDiagnosis(false);
          }
        }}
      />

      <Modal
        isOpen={!!rejectVCModal}
        onClose={() => setRejectVCModal(null)}
        maxWidth="sm"
        title="Reject Estimate"
      >
        {rejectVCModal && (
          <div className="space-y-3">
            {rejectVCModal.eligible && !rejectHasDiscount && (
              <>
                <p className="text-sm text-gray-600">
                  This ticket has an outstanding visit charge of {getActiveCurrency()}{' '}
                  {rejectVCModal.amount.toFixed(2)} that was set to be added to the estimate. Since
                  the customer is rejecting, you can collect it now.
                </p>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rejectCollect}
                    onChange={(e) => setRejectCollect(e.target.checked)}
                  />
                  Collect visit charge now
                </label>
                {rejectCollect && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={rejectPaymentMode}
                      onChange={(e) => {
                        setRejectPaymentMode(e.target.value);
                        setRejectAccountId('');
                      }}
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">Select mode...</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                    </select>
                    {rejectPaymentMode && rejectPaymentMode !== 'CHEQUE' && (
                      <select
                        value={rejectAccountId}
                        onChange={(e) => setRejectAccountId(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="">Select account...</option>
                        {cashBankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is the customer rejecting the estimate?"
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Offer a discount instead (optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rejectDiscountAmount}
                onChange={(e) => setRejectDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If the customer wants a lower price, enter a discount here instead of rejecting — it
                applies immediately and the customer can approve/reject the new total.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectVCModal(null)}>
                Cancel
              </Button>
              <Button
                variant={rejectHasDiscount ? 'default' : 'destructive'}
                disabled={
                  !rejectReason.trim() ||
                  (!rejectHasDiscount &&
                    rejectVCModal.eligible &&
                    rejectCollect &&
                    (!rejectPaymentMode || (rejectPaymentMode !== 'CHEQUE' && !rejectAccountId)))
                }
                onClick={async () => {
                  const visitChargeBody =
                    !rejectHasDiscount && rejectVCModal.eligible && rejectCollect
                      ? {
                          collectVisitCharge: true,
                          paymentMode: rejectPaymentMode,
                          accountId: rejectPaymentMode === 'CHEQUE' ? undefined : rejectAccountId,
                        }
                      : { collectVisitCharge: false };
                  const body = {
                    ...visitChargeBody,
                    reason: rejectReason.trim(),
                    ...(rejectHasDiscount ? { discountAmount: Number(rejectDiscountAmount) } : {}),
                  };
                  const modal = rejectVCModal;
                  if (modal.kind === 'quotation') {
                    await handleRejectQuotation(modal.ticketId, body);
                  } else {
                    await handleRejectCustomer(modal.estimateId, body);
                  }
                  setRejectVCModal(null);
                }}
              >
                {rejectHasDiscount ? 'Offer Discount' : 'Reject Ticket'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
