'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardTable } from '@/components/table/StandardTable';
import { usePagination } from '@/hooks/usePagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCollectionAlerts, CollectionAlert } from '@/lib/invoice';
import {
  Loader2,
  FileText,
  History as HistoryIcon,
  Eye,
  PlusCircle,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import UsageRecordingModal from './UsageRecordingModal';
import ReplaceDeviceModal from './ReplaceDeviceModal';
import UsageHistoryDialog from './UsageHistoryDialog';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { getActiveCurrency } from '@/lib/currency';
import {
  recordSalePayment,
  generateAdvanceBill,
  getAdvanceBillStatus,
  AdvanceBillStatus,
} from '@/lib/saleWorkflow';
import { BillModal } from './BillModal';
import { getApiErrorMessage } from '@/lib/apiError';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchCashBankAccounts,
  filterAccountsByPaymentMode,
  CashBankAccount,
} from '@/lib/finance/accountsApi';
/**
 * Table displaying monthly collection alerts for active contracts.
 * Shows pending usage recording, invoicing, and final summary actions.
 */
export default function MonthlyCollectionTable({
  mode,
  onSuccess,
}: {
  mode?: 'RENT' | 'LEASE';
  onSuccess?: () => void;
}) {
  const currency = useBranchCurrency();
  const [alerts, setAlerts] = useState<CollectionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<CollectionAlert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmSummaryOpen, setConfirmSummaryOpen] = useState(false);
  const [contractToComplete, setContractToComplete] = useState<CollectionAlert | null>(null);

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string>('');
  const [contractItems, setContractItems] = useState<Record<string, string>>({});
  const [advanceBillStatusMap, setAdvanceBillStatusMap] = useState<
    Record<string, AdvanceBillStatus>
  >({});
  const [viewingAdvanceBillId, setViewingAdvanceBillId] = useState<string | null>(null);
  const [advanceBillInitialTab, setAdvanceBillInitialTab] = useState<'view' | 'send'>('view');
  const [generatingAdvanceBillFor, setGeneratingAdvanceBillFor] = useState<string | null>(null);

  // Replace Machine modal state
  const [replaceAllocData, setReplaceAllocData] = useState<{
    contractId: string;
    allocationId: string;
    serialNumber: string;
    modelId: string;
  } | null>(null);

  // Collect Payment modal (INVOICE_PENDING items)
  const [collectTarget, setCollectTarget] = useState<CollectionAlert | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectRef, setCollectRef] = useState('');
  const [collectChequeNo, setCollectChequeNo] = useState('');
  const [collectChequeBankName, setCollectChequeBankName] = useState('');
  const [collectChequeDueDate, setCollectChequeDueDate] = useState('');
  const [collectChequeDate, setCollectChequeDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [collectAccountId, setCollectAccountId] = useState('');
  const [isSavingCollect, setIsSavingCollect] = useState(false);
  const [collectAccounts, setCollectAccounts] = useState<CashBankAccount[]>([]);

  const { page, limit, setPage, setLimit } = usePagination(5);
  // const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  const handleShowHistory = (alertItem: CollectionAlert) => {
    setHistoryContractId(alertItem.contractId);
    setIsHistoryOpen(true);
  };

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // const dateStr = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
      const data = await getCollectionAlerts();
      // Client-side filtering - exclude completed contracts
      const filtered = mode ? data.filter((a) => a.saleType === mode) : data;
      const activeOnly = filtered.filter((a) => a.contractStatus !== 'COMPLETED');
      setAlerts(activeOnly);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
      toast.error('Failed to load collection alerts');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Fetch contract items for display
  useEffect(() => {
    const fetchContractItems = async () => {
      const itemsMap: Record<string, string> = {};
      for (const alertItem of alerts) {
        try {
          const inv = await getInvoiceById(alertItem.contractId);
          const productItems =
            inv.items
              ?.filter((item) => item.itemType === 'PRODUCT')
              .map((item) => item.description)
              .join(', ') || 'No items';
          itemsMap[alertItem.contractId] = productItems;
        } catch {
          itemsMap[alertItem.contractId] = 'N/A';
        }
      }
      setContractItems(itemsMap);
    };
    if (alerts.length > 0) {
      fetchContractItems();
    }
  }, [alerts]);

  // Batched — one call for every row's Advance Bill eligibility/status, not one per row.
  useEffect(() => {
    if (alerts.length === 0) {
      setAdvanceBillStatusMap({});
      return;
    }
    getAdvanceBillStatus(alerts.map((a) => a.contractId))
      .then(setAdvanceBillStatusMap)
      .catch(() => setAdvanceBillStatusMap({}));
  }, [alerts]);

  const handleGenerateOrViewAdvanceBill = async (alertItem: CollectionAlert) => {
    const existing = advanceBillStatusMap[alertItem.contractId];
    if (existing?.advanceBillId) {
      setAdvanceBillInitialTab('view');
      setViewingAdvanceBillId(existing.advanceBillId);
      return;
    }
    setGeneratingAdvanceBillFor(alertItem.contractId);
    try {
      const bill = await generateAdvanceBill(alertItem.contractId);
      setAdvanceBillInitialTab('send');
      setViewingAdvanceBillId(bill.id);
    } catch (err) {
      toast.error('Failed to generate Advance Bill', { description: getApiErrorMessage(err) });
    } finally {
      setGeneratingAdvanceBillFor(null);
    }
  };

  const handleRecordUsage = (alertItem: CollectionAlert) => {
    setSelectedContract(alertItem);
    setIsModalOpen(true);
  };

  const handleGenerateFinalSummary = (alertItem: CollectionAlert) => {
    setContractToComplete(alertItem);
    setConfirmSummaryOpen(true);
  };

  const executeFinalSummary = async () => {
    if (!contractToComplete) return;

    setConfirmSummaryOpen(false);
    setLoading(true);
    try {
      const { generateConsolidatedFinalInvoice } = await import('@/lib/invoice');
      await generateConsolidatedFinalInvoice(contractToComplete.contractId);
      toast.success('Final summary generated and contract completed!');
      fetchAlerts();
      onSuccess?.();
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || 'Failed to generate final summary');
    } finally {
      setLoading(false);
      setContractToComplete(null);
    }
  };

  const openCollect = async (alertItem: CollectionAlert) => {
    const accts = await fetchCashBankAccounts().catch(() => [] as CashBankAccount[]);
    setCollectAccounts(accts);
    setCollectTarget(alertItem);
    setCollectAmount('');
    setCollectMode('CASH');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectRef('');
    setCollectChequeNo('');
    setCollectChequeBankName('');
    setCollectChequeDueDate('');
    setCollectChequeDate(new Date().toISOString().split('T')[0]);
    setCollectAccountId('');
  };

  const handleCollectPayment = async () => {
    if (!collectTarget || !collectAmount) return;
    setIsSavingCollect(true);
    try {
      const context = collectTarget.saleType === 'LEASE' ? 'LEASE_PERIODIC' : 'RENT_PERIODIC';
      await recordSalePayment(collectTarget.contractId, {
        amount: Number(collectAmount),
        paymentMode: collectMode,
        paymentDate: collectDate,
        referenceNumber: collectRef || undefined,
        cashAccountId: collectAccountId || undefined,
        chequeNumber: collectMode === 'CHEQUE' ? collectChequeNo : undefined,
        chequeBankName: collectMode === 'CHEQUE' ? collectChequeBankName : undefined,
        chequeDueDate: collectMode === 'CHEQUE' ? collectChequeDueDate : undefined,
        chequeDate: collectMode === 'CHEQUE' ? collectChequeDate : undefined,
        paymentContext: context,
      });
      toast.success('Periodic payment recorded', {
        description: 'Payment submitted for Accounts approval.',
      });
      setCollectTarget(null);
      fetchAlerts();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsSavingCollect(false);
    }
  };

  const handleViewDetails = async (alertItem: CollectionAlert) => {
    try {
      const targetId = alertItem.finalInvoiceId || alertItem.contractId;
      const inv = await getInvoiceById(targetId);
      setViewingInvoice(inv);
    } catch {
      toast.error('Failed to load invoice details');
    }
  };

  const handleReplaceClick = async (alertItem: CollectionAlert) => {
    try {
      const inv = await getInvoiceById(alertItem.contractId);
      const activeAlloc = inv.productAllocations?.find(
        (a) => a.status !== 'REPLACED' && a.status !== 'RETURNED',
      );
      if (!activeAlloc) {
        toast.error('No active machine allocation found for this contract');
        return;
      }
      setReplaceAllocData({
        contractId: alertItem.contractId,
        allocationId: activeAlloc.id,
        serialNumber: activeAlloc.serialNumber,
        modelId: activeAlloc.modelId,
      });
    } catch {
      toast.error('Failed to load contract details');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Column configuration for StandardTable
  const columns = [
    {
      id: 'invoiceNumber',
      header: 'INV NUMBER',
      cell: (alertItem: CollectionAlert) => (
        <button
          onClick={() => handleViewDetails(alertItem)}
          className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          {alertItem.invoiceNumber}
        </button>
      ),
    },
    {
      id: 'customer',
      header: 'CUSTOMER',
      cell: (alertItem: CollectionAlert) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">
            {alertItem.customerName || 'Unknown Customer'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
            {alertItem.customerPhone || alertItem.customerId}
          </span>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'ITEMS',
      cell: (alertItem: CollectionAlert) => (
        <div className="text-xs font-medium text-slate-700 max-w-[200px] truncate">
          {contractItems[alertItem.contractId] || 'Loading...'}
        </div>
      ),
    },
    {
      id: 'period',
      header: 'BILLING PERIOD',
      cell: (alertItem: CollectionAlert) => {
        if (
          alertItem.contractStatus !== 'COMPLETED' &&
          alertItem.usageData?.billingPeriodStart &&
          alertItem.usageData?.billingPeriodEnd
        ) {
          return (
            <div className="text-xs text-slate-600 font-semibold">
              {format(new Date(alertItem.usageData.billingPeriodStart), 'MMM dd')} -{' '}
              {format(new Date(alertItem.usageData.billingPeriodEnd), 'MMM dd, yyyy')}
            </div>
          );
        }
        return <span className="text-xs text-slate-400">N/A</span>;
      },
    },
    {
      id: 'amount',
      header: 'AMOUNT',
      cell: (alertItem: CollectionAlert) => {
        const isFinalMonth = alertItem.type === 'SUMMARY_PENDING';
        if (isFinalMonth)
          return (
            <span className="text-blue-600 font-bold">{getActiveCurrency()} 0 (Adjusted)</span>
          );
        const isLease = alertItem.saleType === 'LEASE';
        const amount = isLease
          ? alertItem.monthlyLeaseAmount || alertItem.monthlyEmiAmount || alertItem.monthlyRent || 0
          : alertItem.totalAmount || alertItem.monthlyRent || 0;
        return <span className="font-bold">{formatCurrency(amount, currency)}</span>;
      },
    },
    {
      id: 'status',
      header: 'STATUS',
      cell: (alertItem: CollectionAlert) => (
        <div className="flex flex-wrap gap-1">
          {alertItem.type === 'USAGE_PENDING' && (
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
              Usage Pending
            </Badge>
          )}
          {alertItem.type === 'SUMMARY_PENDING' && (
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              Tenure reached
            </Badge>
          )}
          {alertItem.type === 'INVOICE_PENDING' && (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              Usage Completed
            </Badge>
          )}
          {alertItem.contractStatus === 'COMPLETED' && (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              Completed
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'history',
      header: 'HISTORY',
      cell: (alertItem: CollectionAlert) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-full"
          onClick={() => handleShowHistory(alertItem)}
        >
          <HistoryIcon className="h-4 w-4" />
        </Button>
      ),
    },
    {
      id: 'actions',
      header: 'ACTION',
      className: 'text-right',
      cell: (alertItem: CollectionAlert) => (
        <div className="flex justify-end gap-2 text-right">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(alertItem)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {advanceBillStatusMap[alertItem.contractId]?.hasAdvancePayment && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleGenerateOrViewAdvanceBill(alertItem)}
              disabled={generatingAdvanceBillFor === alertItem.contractId}
              className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-all"
              title={
                advanceBillStatusMap[alertItem.contractId]?.advanceBillId
                  ? 'View Advance Bill'
                  : 'Generate Advance Bill'
              }
            >
              {generatingAdvanceBillFor === alertItem.contractId ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>
          )}

          {alertItem.type === 'USAGE_PENDING' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReplaceClick(alertItem)}
                className="h-8 px-3 text-xs font-bold rounded-xl text-amber-600 border-amber-300 hover:bg-amber-50"
                title="Replace Machine"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Replace
              </Button>
              <Button
                size="sm"
                onClick={() => handleRecordUsage(alertItem)}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs font-bold rounded-xl"
              >
                <PlusCircle className="h-3 w-3 mr-2" />
                Record Usage
              </Button>
            </>
          )}
          {alertItem.type === 'SUMMARY_PENDING' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleGenerateFinalSummary(alertItem)}
              className="h-8 px-4 text-xs font-bold rounded-xl"
            >
              <FileText className="h-3 w-3 mr-2" />
              Final Summary
            </Button>
          )}
          {(alertItem.type === 'INVOICE_PENDING' || alertItem.type === 'SEND_PENDING') && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewDetails(alertItem)}
                className="h-8 px-3 text-xs font-bold rounded-xl"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={() => openCollect(alertItem)}
                className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Collect
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Client-side pagination logic
  const paginatedAlerts = alerts.slice((page - 1) * limit, page * limit);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Collections</h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage billing and usage for active contracts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date filtering removed as per req "Dynamic periods" */}
        </div>
      </div>

      <StandardTable
        columns={columns}
        data={paginatedAlerts}
        loading={loading}
        emptyMessage="No pending collections found"
        keyExtractor={(item) => item.contractId}
        page={page}
        limit={limit}
        total={alerts.length}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {isModalOpen && selectedContract && (
        <UsageRecordingModal
          isOpen={isModalOpen}
          onClose={() => {
            console.debug(
              '[MonthlyCollectionTable] UsageRecordingModal onClose fired — tearing down',
            );
            setIsModalOpen(false);
            setEditingInvoice(null);
            setSelectedContract(null);
          }}
          contractId={selectedContract.contractId}
          customerName={selectedContract.customerName}
          onSuccess={() => {
            fetchAlerts();
            onSuccess?.();
          }}
          invoice={editingInvoice}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetailsDialog
          invoice={viewingInvoice}
          mode="FINANCE"
          onClose={() => {
            setViewingInvoice(null);
          }}
        />
      )}

      <UsageHistoryDialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        contractId={historyContractId}
        customerName={
          alerts.find((a) => a.contractId === historyContractId)?.customerName || 'History'
        }
        onSuccess={onSuccess}
      />

      {replaceAllocData && (
        <ReplaceDeviceModal
          isOpen={true}
          onClose={() => setReplaceAllocData(null)}
          contractId={replaceAllocData.contractId}
          allocationId={replaceAllocData.allocationId}
          oldSerialNumber={replaceAllocData.serialNumber}
          modelId={replaceAllocData.modelId}
          onSuccess={() => {
            setReplaceAllocData(null);
            fetchAlerts();
            onSuccess?.();
          }}
        />
      )}

      {/* Collect Payment Dialog */}
      <Dialog open={!!collectTarget} onOpenChange={(v) => !v && setCollectTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Collect Periodic Payment</DialogTitle>
          <div className="bg-emerald-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">
                  Collect Periodic Payment
                </p>
                <p className="text-base font-black">{collectTarget?.invoiceNumber}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Amount
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="h-9 text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Date
                </Label>
                <Input
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="h-9 text-sm font-bold"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payment Mode
              </Label>
              <Select
                value={collectMode}
                onValueChange={(v) => {
                  setCollectMode(v as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE');
                  setCollectAccountId('');
                }}
              >
                <SelectTrigger className="h-9 text-sm font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(collectMode === 'CASH' || collectMode === 'BANK_TRANSFER') &&
              (() => {
                const matching = filterAccountsByPaymentMode(collectAccounts, collectMode);
                return (
                  matching.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Account
                      </Label>
                      <Select value={collectAccountId} onValueChange={setCollectAccountId}>
                        <SelectTrigger className="h-9 text-sm font-bold">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {matching.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} — {a.currency}{' '}
                              {Number(a.currentBalance).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                );
              })()}
            {collectMode === 'CHEQUE' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cheque No.
                  </Label>
                  <Input
                    value={collectChequeNo}
                    onChange={(e) => setCollectChequeNo(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Bank
                  </Label>
                  <Input
                    value={collectChequeBankName}
                    onChange={(e) => setCollectChequeBankName(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cheque Date
                  </Label>
                  <Input
                    type="date"
                    value={collectChequeDate}
                    onChange={(e) => setCollectChequeDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={collectChequeDueDate}
                    onChange={(e) => setCollectChequeDueDate(e.target.value)}
                    className="h-9 text-sm font-bold"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Reference (optional)
              </Label>
              <Input
                value={collectRef}
                onChange={(e) => setCollectRef(e.target.value)}
                placeholder="Ref / transaction ID"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs font-black"
                onClick={() => setCollectTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-9 text-xs font-black bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCollectPayment}
                disabled={isSavingCollect || !collectAmount}
              >
                {isSavingCollect ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit for Approval'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSummaryOpen} onOpenChange={setConfirmSummaryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Final Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to generate the final summary for invoice{' '}
              <strong>{contractToComplete?.invoiceNumber}</strong>? This action will mark the
              contract as COMPLETED and a final consolidated statement will be generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeFinalSummary}
              className="bg-primary hover:bg-primary/90"
            >
              Generate Final Summary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingAdvanceBillId && (
        <BillModal
          usageRecordId={viewingAdvanceBillId}
          open={!!viewingAdvanceBillId}
          onClose={() => setViewingAdvanceBillId(null)}
          onUpdated={() =>
            getAdvanceBillStatus(alerts.map((a) => a.contractId)).then(setAdvanceBillStatusMap)
          }
          initialTab={advanceBillInitialTab}
        />
      )}
    </>
  );
}
