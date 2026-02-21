'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string>('');
  const [contractItems, setContractItems] = useState<Record<string, string>>({});
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
    if (
      !confirm(
        `Are you sure you want to generate the final summary for ${alertItem.invoiceNumber}? This will mark the contract as COMPLETED.`,
      )
    )
      return;

    setLoading(true);
    (async () => {
      try {
        const { generateConsolidatedFinalInvoice } = await import('@/lib/invoice');
        await generateConsolidatedFinalInvoice(alertItem.contractId);
        toast.success('Final summary generated and contract completed!');
        fetchAlerts();
      } catch (error: unknown) {
        toast.error((error as { message?: string }).message || 'Failed to generate final summary');
      } finally {
        setLoading(false);
      }
    })();
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
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>INV NUMBER</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>ITEMS</TableHead>
              <TableHead className="uppercase">Current Billing Period</TableHead>
              <TableHead>AMOUNT</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>HISTORY</TableHead>
              <TableHead className="text-right">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500 bg-slate-50/30">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p className="font-medium text-slate-400">No pending collections found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alertItem) => (
                <TableRow key={alertItem.contractId}>
                  <TableCell className="font-medium">{alertItem.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      {alertItem.customerName || 'Unknown Customer'}
                      <div className="text-xs text-muted-foreground">
                        {alertItem.customerPhone || alertItem.customerId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="text-xs font-medium text-slate-700 truncate">
                      {contractItems[alertItem.contractId] || 'Loading...'}
                    </div>
                  </TableCell>
                  {/* Show empty cell for completed contracts to maintain table structure */}
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {alertItem.contractStatus !== 'COMPLETED' &&
                    alertItem.usageData?.billingPeriodStart &&
                    alertItem.usageData?.billingPeriodEnd
                      ? `${format(new Date(alertItem.usageData.billingPeriodStart), 'MMM dd')} - ${format(new Date(alertItem.usageData.billingPeriodEnd), 'MMM dd, yyyy')}`
                      : alertItem.contractStatus !== 'COMPLETED'
                        ? 'N/A'
                        : ''}
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">
                    {(() => {
                      const isFinalMonth = alertItem.type === 'SUMMARY_PENDING';

                      if (isFinalMonth) return <span className="text-blue-600">₹0 (Adjusted)</span>;

                      const amount = alertItem.totalAmount || alertItem.monthlyRent || 0;
                      return `₹${Number(amount).toLocaleString()}`;
                    })()}
                  </TableCell>
                  <TableCell>
                    {alertItem.type === 'USAGE_PENDING' && (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-600 border-orange-200"
                      >
                        Usage Pending
                      </Badge>
                    )}
                    {alertItem.type === 'SUMMARY_PENDING' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        Tenure reached
                      </Badge>
                    )}
                    {alertItem.type === 'INVOICE_PENDING' && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200"
                      >
                        Usage Completed
                      </Badge>
                    )}
                    {alertItem.contractStatus === 'COMPLETED' && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200 ml-2"
                      >
                        Completed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleShowHistory(alertItem)}
                    >
                      <HistoryIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    {alertItem.type === 'USAGE_PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => handleRecordUsage(alertItem)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
                      >
                        <PlusCircle className="h-3 w-3 mr-1.5" />
                        Record Usage
                      </Button>
                    )}
                    {alertItem.type === 'SUMMARY_PENDING' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleGenerateFinalSummary(alertItem)}
                        className="h-7 px-3 text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1.5" />
                        Final Summary
                      </Button>
                    )}
                    {(alertItem.type === 'INVOICE_PENDING' ||
                      alertItem.type === 'SEND_PENDING') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(alertItem)}
                        className="h-7 px-3 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1.5" />
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </>
  );
}
