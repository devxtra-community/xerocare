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
import { Loader2, FileText, History as HistoryIcon, Eye, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import { getInvoiceById, Invoice } from '@/lib/invoice';
import UsageRecordingModal from './UsageRecordingModal';
import UsageHistoryDialog from './UsageHistoryDialog';

/**
 * Table displaying monthly collection alerts for active contracts.
 * Shows pending usage recording, invoicing, and final summary actions.
 */
export default function MonthlyCollectionTable({ mode }: { mode?: 'RENT' | 'LEASE' }) {
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

  const { page, limit, setPage, setLimit } = usePagination(10);
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
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || 'Failed to generate final summary');
    } finally {
      setLoading(false);
      setContractToComplete(null);
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
      accessorKey: 'invoiceNumber' as keyof CollectionAlert,
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
        if (isFinalMonth) return <span className="text-blue-600 font-bold">₹0 (Adjusted)</span>;
        const amount = alertItem.totalAmount || alertItem.monthlyRent || 0;
        return <span className="font-bold">₹{Number(amount).toLocaleString()}</span>;
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
        <div className="flex justify-end gap-2">
          {alertItem.type === 'USAGE_PENDING' && (
            <Button
              size="sm"
              onClick={() => handleRecordUsage(alertItem)}
              className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs font-bold rounded-xl"
            >
              <PlusCircle className="h-3 w-3 mr-2" />
              Record Usage
            </Button>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDetails(alertItem)}
              className="h-8 px-4 text-xs font-bold rounded-xl"
            >
              <Eye className="h-3 w-3 mr-2" />
              View
            </Button>
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

      {selectedContract && (
        <UsageRecordingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingInvoice(null);
          }}
          contractId={selectedContract.contractId}
          customerName={selectedContract.customerName}
          onSuccess={fetchAlerts}
          invoice={editingInvoice}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetailsDialog
          invoice={viewingInvoice}
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
      />

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
    </>
  );
}
