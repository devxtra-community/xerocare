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

  const handleShowHistory = (alert: CollectionAlert) => {
    setHistoryContractId(alert.contractId);
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
      for (const alert of alerts) {
        try {
          const inv = await getInvoiceById(alert.contractId);
          const productItems =
            inv.items
              ?.filter((item) => item.itemType === 'PRODUCT')
              .map((item) => item.description)
              .join(', ') || 'No items';
          itemsMap[alert.contractId] = productItems;
        } catch {
          itemsMap[alert.contractId] = 'N/A';
        }
      }
      setContractItems(itemsMap);
    };
    if (alerts.length > 0) {
      fetchContractItems();
    }
  }, [alerts]);

  const handleRecordUsage = (alert: CollectionAlert) => {
    setSelectedContract(alert);
    setIsModalOpen(true);
  };

  const confirmFinalSummary = (alert: CollectionAlert) => {
    setContractToComplete(alert);
    setConfirmSummaryOpen(true);
  };

  const executeFinalSummary = async () => {
    if (!contractToComplete) return;

    setLoading(true);
    setConfirmSummaryOpen(false);
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

  const handleViewDetails = async (alert: CollectionAlert) => {
    try {
      const targetId = alert.finalInvoiceId || alert.contractId;
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

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Monthly Collections</h2>
          <p className="text-sm text-slate-500">Manage billing and usage for current periods</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date filtering removed as per req "Dynamic periods" */}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <StandardTable
          columns={[
            {
              id: 'inv',
              header: 'INV NUMBER',
              accessorKey: 'invoiceNumber' as keyof CollectionAlert,
              className: 'font-medium uppercase text-[11px] text-primary',
            },
            {
              id: 'customer',
              header: 'CUSTOMER',
              className: 'font-semibold uppercase text-[11px] text-primary',
              cell: (alert: CollectionAlert) => (
                <div className="flex flex-col">
                  <span className="font-medium text-[13px]">
                    {alert.customerName || 'Unknown Customer'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {alert.customerPhone || alert.customerId}
                  </span>
                </div>
              ),
            },
            {
              id: 'items',
              header: 'ITEMS',
              className: 'font-semibold uppercase text-[11px] text-primary max-w-[200px]',
              cell: (alert: CollectionAlert) => (
                <div className="text-[12px] font-medium text-slate-700 truncate">
                  {contractItems[alert.contractId] || 'Loading...'}
                </div>
              ),
            },
            {
              id: 'period',
              header: 'CURRENT BILLING PERIOD',
              className: 'font-semibold uppercase text-[11px] text-primary',
              cell: (alert: CollectionAlert) => {
                if (alert.contractStatus === 'COMPLETED') return '';
                if (alert.usageData?.billingPeriodStart && alert.usageData?.billingPeriodEnd) {
                  return `${format(new Date(alert.usageData.billingPeriodStart), 'MMM dd')} - ${format(new Date(alert.usageData.billingPeriodEnd), 'MMM dd, yyyy')}`;
                }
                return 'N/A';
              },
            },
            {
              id: 'amount',
              header: 'AMOUNT',
              className: 'font-semibold uppercase text-[11px] text-primary',
              cell: (alert: CollectionAlert) => {
                const isFinalMonth = alert.type === 'SUMMARY_PENDING';
                if (isFinalMonth)
                  return <span className="text-blue-600 font-bold">₹0 (Adjusted)</span>;
                const amount = alert.totalAmount || alert.monthlyRent || 0;
                return (
                  <span className="font-bold text-slate-700">
                    ₹{Number(amount).toLocaleString()}
                  </span>
                );
              },
            },
            {
              id: 'status',
              header: 'STATUS',
              className: 'font-semibold uppercase text-[11px] text-primary',
              cell: (alert: CollectionAlert) => (
                <div className="flex flex-col gap-1 items-start">
                  {alert.type === 'USAGE_PENDING' && (
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-600 border-orange-200 uppercase text-[9px] font-bold"
                    >
                      Usage Pending
                    </Badge>
                  )}
                  {alert.type === 'SUMMARY_PENDING' && (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-600 border-blue-200 uppercase text-[9px] font-bold"
                    >
                      Tenure reached
                    </Badge>
                  )}
                  {alert.type === 'INVOICE_PENDING' && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-600 border-green-200 uppercase text-[9px] font-bold"
                    >
                      Usage Completed
                    </Badge>
                  )}
                  {alert.contractStatus === 'COMPLETED' && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-600 border-green-200 uppercase text-[9px] font-bold mt-1"
                    >
                      Completed
                    </Badge>
                  )}
                </div>
              ),
            },
            {
              id: 'history',
              header: 'HISTORY',
              className: 'font-semibold uppercase text-[11px] text-primary',
              cell: (alert: CollectionAlert) => (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                  onClick={() => handleShowHistory(alert)}
                  title="View History"
                >
                  <HistoryIcon className="h-4 w-4" />
                </Button>
              ),
            },
            {
              id: 'action',
              header: 'ACTION',
              className: 'font-semibold text-[11px] text-primary uppercase text-right',
              cell: (alert: CollectionAlert) => (
                <div className="flex justify-end gap-1">
                  {alert.type === 'USAGE_PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => handleRecordUsage(alert)}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-[11px] font-medium"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Record Usage
                    </Button>
                  )}
                  {alert.type === 'SUMMARY_PENDING' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmFinalSummary(alert)}
                      className="h-8 px-3 text-[11px] font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Final Summary
                    </Button>
                  )}
                  {(alert.type === 'INVOICE_PENDING' || alert.type === 'SEND_PENDING') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(alert)}
                      className="h-8 px-3 text-[11px] font-medium"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={alerts.slice((page - 1) * limit, page * limit)}
          loading={loading}
          emptyMessage="No pending collections found"
          keyExtractor={(a) => a.contractId}
          page={page}
          limit={limit}
          total={alerts.length}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

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
