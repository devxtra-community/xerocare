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
import {
  getCompletedCollections,
  CompletedCollection,
  sendConsolidatedInvoice,
} from '@/lib/invoice';
import { Loader2, RefreshCw, FileText, History as HistoryIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import UsageHistoryDialog from './UsageHistoryDialog';
import ConsolidatedStatementDialog from './ConsolidatedStatementDialog';

/**
 * Table displaying completed contract collections (Rent/Lease).
 * Allows viewing usage history, generating statements, and sending invoices.
 */
export default function CompletedCollectionsTable({ mode }: { mode?: 'RENT' | 'LEASE' }) {
  const [collections, setCollections] = useState<CompletedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string>('');
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementCollection, setStatementCollection] = useState<CompletedCollection | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompletedCollections();
      const filtered = mode ? data.filter((c) => c.saleType === mode) : data;
      setCollections(filtered);
    } catch {
      toast.error('Failed to load completed collections');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleShowHistory = (contractId: string) => {
    setHistoryContractId(contractId);
    setIsHistoryOpen(true);
  };

  const handleViewStatement = (collection: CompletedCollection) => {
    setStatementCollection(collection);
    setIsStatementOpen(true);
  };

  const handleSendInvoice = async (collection: CompletedCollection) => {
    try {
      toast.loading(`Sending invoice to ${collection.customerName}...`);
      await sendConsolidatedInvoice(collection.contractId);
      toast.dismiss();
      toast.success('Invoice sent successfully');
    } catch {
      toast.dismiss();
      toast.error('Failed to send invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Completed Collections</h2>
          <p className="text-sm text-slate-500">
            View finished contracts and total collected amounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCollections} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>CONTRACT #</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>PERIOD</TableHead>
              <TableHead className="text-right">TOTAL COLLECTED</TableHead>
              <TableHead>HISTORY</TableHead>
              <TableHead className="text-right">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No completed collections found
                </TableCell>
              </TableRow>
            ) : (
              collections.map((collection) => (
                <TableRow key={collection.contractId}>
                  <TableCell className="font-medium">{collection.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{collection.customerName}</div>
                      {collection.customerPhone && (
                        <div className="text-sm text-slate-500">{collection.customerPhone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {collection.effectiveFrom && collection.effectiveTo && (
                        <>
                          {format(new Date(collection.effectiveFrom), 'MMM dd, yyyy')} -<br />
                          {format(new Date(collection.effectiveTo), 'MMM dd, yyyy')}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    ₹{collection.totalCollected?.toLocaleString('en-IN') || '0'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleShowHistory(collection.contractId)}
                      title="View Usage History"
                    >
                      <HistoryIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50 gap-1"
                        onClick={() => handleSendInvoice(collection)}
                        title="Send to Customer"
                      >
                        <Send className="h-3 w-3" />
                        SEND
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] font-bold border-green-200 text-green-600 hover:bg-green-50 gap-1"
                        onClick={() => handleViewStatement(collection)}
                        title="View Consolidated Statement"
                      >
                        <FileText className="h-3 w-3" />
                        VIEW STATEMENT
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isHistoryOpen && historyContractId && (
        <UsageHistoryDialog
          isOpen={isHistoryOpen}
          contractId={historyContractId}
          customerName={
            collections.find((c) => c.contractId === historyContractId)?.customerName || ''
          }
          onClose={() => {
            setIsHistoryOpen(false);
            setHistoryContractId('');
          }}
        />
      )}

      {isStatementOpen && statementCollection && (
        <ConsolidatedStatementDialog
          isOpen={isStatementOpen}
          collection={statementCollection}
          onClose={() => {
            setIsStatementOpen(false);
            setStatementCollection(null);
          }}
        />
      )}
    </>
  );
}
