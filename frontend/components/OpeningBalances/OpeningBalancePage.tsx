'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  OpeningBalanceEntry,
  BalanceType,
  createOpeningBalanceEntry,
  getOpeningBalanceEntries,
  updateOpeningBalanceEntry,
  deleteOpeningBalanceEntry,
} from '@/lib/openingBalance';
import { getCustomers, Customer, createCustomer, CreateCustomerData } from '@/lib/customer';
import { getUserFromToken } from '@/lib/auth';
import { SearchableSelect } from '@/components/ui/searchable-select';
import CustomerFormDialog from '@/components/employeeComponents/CustomerFormDialog';
import OpeningBalanceSummaryCards from './OpeningBalanceSummaryCards';
import OpeningBalanceTable from './OpeningBalanceTable';
import OpeningBalanceDetailPanel from './OpeningBalanceDetailPanel';
import { InvoiceAccountView } from '../invoice/InvoiceAccountView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface BranchAggregation {
  branchName: string;
  totalMigrated: number;
  totalRemaining: number;
  totalPaid: number;
  activeCount: number;
  totalCount: number;
}

export default function OpeningBalancePage() {
  const [entries, setEntries] = useState<OpeningBalanceEntry[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('EMPLOYEE');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<OpeningBalanceEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<OpeningBalanceEntry | null>(null);
  const [accountViewOpen, setAccountViewOpen] = useState(false);
  const [reconcileInvoiceId, setReconcileInvoiceId] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSettled, setFilterSettled] = useState<string>('ALL');

  // Form states
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    balanceType: 'SALE_OUTSTANDING' as BalanceType,
    originalTotalAmount: '',
    alreadyPaidAmount: '',
    monthlyBillingAmount: '',
    billingCycleInDays: '30',
    nextPaymentDueDate: '',
    totalContractMonths: '',
    monthsCompleted: '',
    productBrand: '',
    productModel: '',
    serialNumber: '',
    productId: '',
    notes: '',
    migratedAt: new Date().toISOString().split('T')[0],
  });

  const [editFormData, setEditFormData] = useState({
    monthlyBillingAmount: '',
    billingCycleInDays: '30',
    nextPaymentDueDate: '',
    totalContractMonths: '',
    monthsCompleted: '',
    productBrand: '',
    productModel: '',
    serialNumber: '',
    productId: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const user = getUserFromToken();
      if (user) {
        setUserRole(user.role);
      }

      // Fetch customers & entries
      const [customersList, entriesData] = await Promise.all([
        getCustomers(),
        getOpeningBalanceEntries({ limit: 1000 }),
      ]);

      setCustomers(customersList || []);
      setEntries(entriesData.data || []);

      // Build customer name lookup map
      const lookup: Record<string, string> = {};
      if (customersList) {
        customersList.forEach((c) => {
          lookup[c.id] = c.name;
        });
      }
      setCustomerNames(lookup);
    } catch (err) {
      console.error('Failed to load opening balances data:', err);
      toast.error('Failed to fetch migrated data from the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    const original = Number(createFormData.originalTotalAmount);
    const paid = Number(createFormData.alreadyPaidAmount || 0);

    if (isNaN(original) || original <= 0) {
      toast.error('Please enter a valid original total amount');
      return;
    }
    if (paid > original) {
      toast.error('Already paid amount cannot exceed original total value');
      return;
    }

    const isContract = ['RENT_CONTRACT', 'LEASE_CONTRACT'].includes(createFormData.balanceType);
    if (isContract) {
      if (
        !createFormData.monthlyBillingAmount ||
        Number(createFormData.monthlyBillingAmount) <= 0
      ) {
        toast.error('Monthly billing amount is required for Rent/Lease contracts');
        return;
      }
      if (!createFormData.nextPaymentDueDate) {
        toast.error('Next payment due date is required for Rent/Lease contracts');
        return;
      }
    }

    try {
      const payload = {
        customerId: createFormData.customerId,
        balanceType: createFormData.balanceType,
        originalTotalAmount: original,
        alreadyPaidAmount: paid,
        monthlyBillingAmount: createFormData.monthlyBillingAmount
          ? Number(createFormData.monthlyBillingAmount)
          : undefined,
        billingCycleInDays: createFormData.billingCycleInDays
          ? Number(createFormData.billingCycleInDays)
          : undefined,
        nextPaymentDueDate: createFormData.nextPaymentDueDate || undefined,
        totalContractMonths: createFormData.totalContractMonths
          ? Number(createFormData.totalContractMonths)
          : undefined,
        monthsCompleted: createFormData.monthsCompleted
          ? Number(createFormData.monthsCompleted)
          : undefined,
        productBrand: createFormData.productBrand || undefined,
        productModel: createFormData.productModel || undefined,
        serialNumber: createFormData.serialNumber || undefined,
        productId: createFormData.productId || undefined,
        notes: createFormData.notes || undefined,
        migratedAt: createFormData.migratedAt || undefined,
      };

      await createOpeningBalanceEntry(payload);
      toast.success('Opening balance entry migrated successfully');
      setIsCreateOpen(false);

      // Reset form
      setCreateFormData({
        customerId: '',
        balanceType: 'SALE_OUTSTANDING',
        originalTotalAmount: '',
        alreadyPaidAmount: '',
        monthlyBillingAmount: '',
        billingCycleInDays: '30',
        nextPaymentDueDate: '',
        totalContractMonths: '',
        monthsCompleted: '',
        productBrand: '',
        productModel: '',
        serialNumber: '',
        productId: '',
        notes: '',
        migratedAt: new Date().toISOString().split('T')[0],
      });

      loadData();
    } catch (err) {
      console.error(err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.message || 'Failed to submit migration record');
    }
  };

  const handleCustomerSubmit = async (data: Partial<CreateCustomerData>) => {
    try {
      const newCust = await createCustomer(data as CreateCustomerData);
      toast.success('Customer created successfully');
      setCustomers((prev) => [...prev, newCust]);
      setCustomerNames((prev) => ({ ...prev, [newCust.id]: newCust.name }));
      setCreateFormData((prev) => ({ ...prev, customerId: newCust.id }));
    } catch (err) {
      console.error(err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.message || 'Failed to create customer');
      throw err;
    }
  };

  const handleEditOpen = (entry: OpeningBalanceEntry) => {
    setEditingEntry(entry);
    setEditFormData({
      monthlyBillingAmount: entry.monthlyBillingAmount?.toString() || '',
      billingCycleInDays: entry.billingCycleInDays?.toString() || '30',
      nextPaymentDueDate: entry.nextPaymentDueDate ? entry.nextPaymentDueDate.split('T')[0] : '',
      totalContractMonths: entry.totalContractMonths?.toString() || '',
      monthsCompleted: entry.monthsCompleted?.toString() || '',
      productBrand: entry.productBrand || '',
      productModel: entry.productModel || '',
      serialNumber: entry.serialNumber || '',
      productId: entry.productId || '',
      notes: entry.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const payload = {
        monthlyBillingAmount: editFormData.monthlyBillingAmount
          ? Number(editFormData.monthlyBillingAmount)
          : undefined,
        billingCycleInDays: editFormData.billingCycleInDays
          ? Number(editFormData.billingCycleInDays)
          : undefined,
        nextPaymentDueDate: editFormData.nextPaymentDueDate || undefined,
        totalContractMonths: editFormData.totalContractMonths
          ? Number(editFormData.totalContractMonths)
          : undefined,
        monthsCompleted: editFormData.monthsCompleted
          ? Number(editFormData.monthsCompleted)
          : undefined,
        productBrand: editFormData.productBrand || undefined,
        productModel: editFormData.productModel || undefined,
        serialNumber: editFormData.serialNumber || undefined,
        productId: editFormData.productId || undefined,
        notes: editFormData.notes || undefined,
      };

      await updateOpeningBalanceEntry(editingEntry.id, payload);
      toast.success('Opening balance entry updated successfully');
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.message || 'Failed to update migration record');
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to soft-delete this opening balance entry? This will soft-delete the linked invoice and ledger records as well.',
      )
    ) {
      return;
    }

    try {
      await deleteOpeningBalanceEntry(id);
      toast.success('Opening balance entry soft-deleted successfully');
      loadData();
    } catch (err) {
      console.error(err);
      const apiErr = err as ApiError;
      toast.error(apiErr.response?.data?.message || 'Failed to delete migration record');
    }
  };

  // Filtering
  const filtered = entries.filter((entry) => {
    const custName = (customerNames[entry.customerId] || '').toLowerCase();
    const entryNum = entry.entryNumber.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesQuery = custName.includes(query) || entryNum.includes(query);
    const matchesType = filterType === 'ALL' || entry.balanceType === filterType;

    let matchesSettled = true;
    if (filterSettled === 'SETTLED') matchesSettled = entry.isFullySettled;
    else if (filterSettled === 'OUTSTANDING') matchesSettled = !entry.isFullySettled;

    return matchesQuery && matchesType && matchesSettled;
  });

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.email || c.phone,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Opening Balance & Contract Migrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Migrate customer outstanding debts and active mid-cycle contracts at software go-live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            className="rounded-full p-2 h-10 w-10 flex items-center justify-center border-none bg-card hover:bg-slate-100 transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {['ADMIN', 'MANAGER', 'FINANCE', 'EMPLOYEE'].includes(userRole) && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-full h-10 px-5 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Migrate Opening State
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <OpeningBalanceSummaryCards entries={entries} />

      {/* Branch Aggregation Table for Admin & Finance */}
      {['ADMIN', 'FINANCE'].includes(userRole) && entries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Branch-wise Migration Summary
            </h3>
            <span className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
              Central Office Consolidation
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="pb-3 pr-4">Branch Name</th>
                  <th className="pb-3 px-4 text-right">Total Migrated</th>
                  <th className="pb-3 px-4 text-right">Remaining Outstanding</th>
                  <th className="pb-3 px-4 text-right">Collected Amount</th>
                  <th className="pb-3 pl-4 text-center">Active / Total Entries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {Object.values(
                  entries.reduce((acc: Record<string, BranchAggregation>, entry) => {
                    const branchKey = entry.branchName || 'Unknown Branch';
                    if (!acc[branchKey]) {
                      acc[branchKey] = {
                        branchName: branchKey,
                        totalMigrated: 0,
                        totalRemaining: 0,
                        totalPaid: 0,
                        activeCount: 0,
                        totalCount: 0,
                      };
                    }
                    acc[branchKey].totalMigrated += Number(entry.originalTotalAmount || 0);
                    acc[branchKey].totalRemaining += Number(entry.remainingBalance || 0);
                    acc[branchKey].totalPaid +=
                      Number(entry.alreadyPaidAmount || 0) +
                      Math.max(
                        0,
                        Number(entry.openingBalance || 0) - Number(entry.remainingBalance || 0),
                      );
                    acc[branchKey].totalCount += 1;
                    if (!entry.isFullySettled) {
                      acc[branchKey].activeCount += 1;
                    }
                    return acc;
                  }, {}),
                ).map((agg: BranchAggregation) => (
                  <tr
                    key={agg.branchName}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200">
                      {agg.branchName}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      QAR{' '}
                      {agg.totalMigrated.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-500">
                      QAR{' '}
                      {agg.totalRemaining.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-500">
                      QAR{' '}
                      {agg.totalPaid.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 pl-4 text-center text-xs font-semibold">
                      <span className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
                        {agg.activeCount} / {agg.totalCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or entry number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="SALE_OUTSTANDING">Sale Outstanding</option>
              <option value="RENT_CONTRACT">Rent Contract</option>
              <option value="LEASE_CONTRACT">Lease Contract</option>
              <option value="SERVICE_DEBT">Service Debt</option>
              <option value="OTHER_DEBT">Other Outstanding</option>
            </select>
          </div>

          <select
            value={filterSettled}
            onChange={(e) => setFilterSettled(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OUTSTANDING">Outstanding</option>
            <option value="SETTLED">Fully Settled</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading && entries.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span>Fetching opening balance entries...</span>
        </div>
      ) : (
        <OpeningBalanceTable
          entries={filtered}
          customerNames={customerNames}
          onSelect={setSelectedEntry}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
          userRole={userRole}
        />
      )}

      {/* Detail Slideover/Panel */}
      <OpeningBalanceDetailPanel
        entry={selectedEntry}
        customerName={selectedEntry ? customerNames[selectedEntry.customerId] || 'Customer' : ''}
        onClose={() => setSelectedEntry(null)}
        onNavigateToInvoice={(invoiceId) => {
          setSelectedEntry(null);
          setReconcileInvoiceId(invoiceId);
          setAccountViewOpen(true);
        }}
      />

      {accountViewOpen && reconcileInvoiceId && (
        <InvoiceAccountView
          invoiceId={reconcileInvoiceId}
          open={accountViewOpen}
          onClose={() => {
            setAccountViewOpen(false);
            setReconcileInvoiceId(null);
            loadData();
          }}
        />
      )}

      {/* Create Dialog Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogOverlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6"
        >
          <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">Migrate Opening State</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Register customer outstanding positions and ongoing mid-cycle contracts.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <form
            onSubmit={handleCreateSubmit}
            className="space-y-6 pt-6 text-slate-700 dark:text-slate-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Customer Selector */}
              <div className="space-y-1.5 col-span-2">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Customer
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    + Create Customer
                  </button>
                </div>
                <SearchableSelect
                  options={customerOptions}
                  value={createFormData.customerId}
                  onValueChange={(val) => setCreateFormData({ ...createFormData, customerId: val })}
                  placeholder="Choose Customer..."
                  emptyText="No customers found."
                />
              </div>

              {/* Balance Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Balance Type
                </label>
                <select
                  value={createFormData.balanceType}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      balanceType: e.target.value as BalanceType,
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="SALE_OUTSTANDING">Sale Outstanding</option>
                  <option value="RENT_CONTRACT">Rent Contract Migration</option>
                  <option value="LEASE_CONTRACT">Lease Contract Migration</option>
                  <option value="SERVICE_DEBT">Service Debt</option>
                  <option value="OTHER_DEBT">Other Outstanding Debt</option>
                </select>
              </div>

              {/* Migrated At Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Migrated Date (Go-Live)
                </label>
                <Input
                  type="date"
                  value={createFormData.migratedAt}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, migratedAt: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              {/* Original Total Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Original Total Amount (QAR)
                </label>
                <Input
                  required
                  type="number"
                  placeholder="e.g. 10000"
                  value={createFormData.originalTotalAmount}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, originalTotalAmount: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              {/* Already Paid Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Already Paid Pre-Go-Live (QAR)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 3000"
                  value={createFormData.alreadyPaidAmount}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, alreadyPaidAmount: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              {/* Contract Fields Section */}
              {['RENT_CONTRACT', 'LEASE_CONTRACT'].includes(createFormData.balanceType) && (
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="col-span-2">
                    <h4 className="text-xs font-bold text-primary uppercase">
                      Recurring Billing Configuration
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Monthly Billing Amount (QAR)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 1500"
                      value={createFormData.monthlyBillingAmount}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          monthlyBillingAmount: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Billing Cycle (In Days)
                    </label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={createFormData.billingCycleInDays}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, billingCycleInDays: e.target.value })
                      }
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Next Payment Due Date
                    </label>
                    <Input
                      type="date"
                      value={createFormData.nextPaymentDueDate}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, nextPaymentDueDate: e.target.value })
                      }
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Total Contract Months
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={createFormData.totalContractMonths}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          totalContractMonths: e.target.value,
                        })
                      }
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Months Already Completed
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      value={createFormData.monthsCompleted}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, monthsCompleted: e.target.value })
                      }
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {/* Machine/Asset Details Section */}
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="col-span-2">
                  <h4 className="text-xs font-bold text-primary uppercase">
                    Machine / Asset Details (Optional)
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Product Brand
                  </label>
                  <Input
                    placeholder="e.g. Xerox"
                    value={createFormData.productBrand}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, productBrand: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Product Model
                  </label>
                  <Input
                    placeholder="e.g. VersaLink C405"
                    value={createFormData.productModel}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, productModel: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Serial Number
                  </label>
                  <Input
                    placeholder="e.g. XRX-9827361"
                    value={createFormData.serialNumber}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, serialNumber: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Product/Asset ID
                  </label>
                  <Input
                    placeholder="e.g. PROD-102"
                    value={createFormData.productId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, productId: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Migration Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context regarding this outstanding debt or mid-cycle contract..."
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <Button type="submit" className="h-11 px-8 rounded-xl">
                Migrate State
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogOverlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6"
        >
          <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">Edit Migration Parameters</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Update notes, contract configurations, or machine details.
              </p>
            </div>
            <button
              onClick={() => setIsEditOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <form
            onSubmit={handleEditSubmit}
            className="space-y-6 pt-6 text-slate-700 dark:text-slate-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editingEntry &&
                ['RENT_CONTRACT', 'LEASE_CONTRACT'].includes(editingEntry.balanceType) && (
                  <>
                    <div className="col-span-2">
                      <h4 className="text-xs font-bold text-primary uppercase">
                        Recurring Billing Configuration
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Monthly Billing Amount (QAR)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 1500"
                        value={editFormData.monthlyBillingAmount}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, monthlyBillingAmount: e.target.value })
                        }
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Billing Cycle (In Days)
                      </label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={editFormData.billingCycleInDays}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, billingCycleInDays: e.target.value })
                        }
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Next Payment Due Date
                      </label>
                      <Input
                        type="date"
                        value={editFormData.nextPaymentDueDate}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, nextPaymentDueDate: e.target.value })
                        }
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total Contract Months
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 12"
                        value={editFormData.totalContractMonths}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, totalContractMonths: e.target.value })
                        }
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Months Already Completed
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 5"
                        value={editFormData.monthsCompleted}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, monthsCompleted: e.target.value })
                        }
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                      />
                    </div>
                  </>
                )}

              <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-primary uppercase">
                  Machine / Asset Details
                </h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Product Brand
                </label>
                <Input
                  placeholder="e.g. Xerox"
                  value={editFormData.productBrand}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, productBrand: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Product Model
                </label>
                <Input
                  placeholder="e.g. VersaLink C405"
                  value={editFormData.productModel}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, productModel: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Serial Number
                </label>
                <Input
                  placeholder="e.g. XRX-9827361"
                  value={editFormData.serialNumber}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, serialNumber: e.target.value })
                  }
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Product/Asset ID
                </label>
                <Input
                  placeholder="e.g. PROD-102"
                  value={editFormData.productId}
                  onChange={(e) => setEditFormData({ ...editFormData, productId: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm"
                />
              </div>

              <div className="space-y-1.5 col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Migration Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Update notes..."
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <Button type="submit" className="h-11 px-8 rounded-xl">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog Modal */}
      <CustomerFormDialog
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        customer={null}
        onSubmit={handleCustomerSubmit}
      />
    </div>
  );
}
