import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Calendar,
  User,
  History as HistoryIcon,
  Printer,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { Invoice, getInvoiceById, generateConsolidatedFinalInvoice } from '@/lib/invoice';
import { format } from 'date-fns';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import UsageRecordingModal from '@/components/Finance/UsageRecordingModal';

interface UsageRecord {
  id: string;
  periodStart?: string;
  periodEnd?: string;
  monthlyRent?: number | string;
  bwA4Count?: number;
  bwA3Count?: number;
  colorA4Count?: number;
  colorA3Count?: number;
  exceededTotal?: number;
  exceededCharge?: number;
  totalCharge?: number;
  meterImageUrl?: string;
  finalInvoiceId?: string;
}

interface RentHistoryViewProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * View displaying the history of a rental contract.
 * Shows contract terms, usage records, invoices, and allows recording new usage or completing the contract.
 */
export default function RentHistoryView({ contractId, isOpen, onClose }: RentHistoryViewProps) {
  const [contract, setContract] = useState<Invoice | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // State for viewing invoice details
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // State for recording new usage
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInvoiceById(contractId);
      setContract(data);
      // Set usage records
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsageRecords((data as any).usageHistory || []);
    } catch (error) {
      console.error('Failed to fetch contract history:', error);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (isOpen && contractId) {
      fetchData();
    }
  }, [isOpen, contractId, fetchData]);

  const handleCompleteContract = async () => {
    if (
      !contract ||
      !window.confirm(
        'Are you sure you want to complete this contract? This will generate the FINAL consolidated invoice.',
      )
    )
      return;
    try {
      setLoading(true);
      await generateConsolidatedFinalInvoice(contract.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to complete contract:', error);
      alert('Failed to complete contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50/50 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <HistoryIcon size={24} />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                  Rent Contract History
                </DialogTitle>
                <div className="text-xs text-muted-foreground font-medium flex gap-2 items-center">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    #{contract?.invoiceNumber}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-slate-500 uppercase">
                    {contract?.customerName}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : contract ? (
              <>
                {/* Contract Overview Card */}
                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" /> Contract Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Customer
                      </p>
                      <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                        <User size={14} className="text-slate-400" />
                        {contract.customerName}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Duration
                      </p>
                      <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span>
                          {contract.effectiveFrom &&
                            format(new Date(contract.effectiveFrom), 'dd MMM yyyy')}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span>
                          {contract.effectiveTo
                            ? format(new Date(contract.effectiveTo), 'dd MMM yyyy')
                            : 'Ongoing'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Billing Cycle
                      </p>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 font-bold text-[10px] uppercase tracking-wider"
                        >
                          {contract.rentPeriod}
                          {contract.rentPeriod === 'CUSTOM' &&
                            ` (${contract.billingCycleInDays} Days)`}
                        </Badge>
                        {/* Removed pending amount display as it requires backend support, can be added later */}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Monthly Rent
                      </p>
                      <div className="font-bold text-slate-800 text-lg flex items-baseline gap-1">
                        QAR {contract.monthlyRent?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Management Actions (Finance Only for managing usage) */}
                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest">
                      Management Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-wrap gap-4">
                    {contract.contractStatus !== 'COMPLETED' ? (
                      <>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl h-10 px-6 gap-2 text-white"
                          onClick={() => setIsUsageModalOpen(true)}
                        >
                          <PlusCircle size={16} />
                          Record Monthly Usage
                        </Button>
                        <Button
                          variant="destructive"
                          className="font-bold text-xs rounded-xl h-10 px-6 gap-2"
                          onClick={handleCompleteContract}
                          disabled={usageRecords.length === 0}
                        >
                          <FileText size={16} />
                          Complete Contract & Bill
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-2 text-sm">
                        ✓ Contract Completed
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Invoices History Table */}
                <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <Printer size={14} className="text-purple-500" /> Monthly Usage & Invoices
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-white text-slate-500 border-slate-200 font-mono text-[10px]"
                    >
                      {usageRecords.length} RECORDS
                    </Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100">
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10">
                            Period
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-right">
                            Monthly Rent
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Total Usage (Norm)
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Exceeded
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-right">
                            Exceeded Charge
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-right">
                            Total Charge
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Meter Image
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12 text-muted-foreground text-xs font-medium bg-slate-50/20"
                            >
                              No usage records yet. Click &quot;Create New Usage&quot; to add one.
                            </TableCell>
                          </TableRow>
                        ) : (
                          usageRecords.map((usage) => {
                            const isBilled = !!usage.finalInvoiceId;
                            const totalUsage =
                              (usage.bwA4Count || 0) +
                              (usage.bwA3Count || 0) * 2 +
                              ((usage.colorA4Count || 0) + (usage.colorA3Count || 0) * 2);

                            return (
                              <TableRow
                                key={usage.id}
                                className="hover:bg-blue-50/30 border-slate-50 transition-colors"
                              >
                                <TableCell className="text-[11px] font-medium text-slate-600">
                                  {usage.periodStart
                                    ? format(new Date(usage.periodStart), 'd MMM')
                                    : '-'}
                                  {' - '}
                                  {usage.periodEnd
                                    ? format(new Date(usage.periodEnd), 'd MMM yyyy')
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-slate-600">
                                  {usage.monthlyRent
                                    ? `QAR ${Number(usage.monthlyRent).toLocaleString()}`
                                    : 'QAR 0'}
                                </TableCell>
                                <TableCell className="text-center font-mono text-[11px]">
                                  {totalUsage.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center font-mono text-[11px] text-orange-600">
                                  {usage.exceededTotal ? usage.exceededTotal.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-slate-600">
                                  {usage.exceededCharge
                                    ? `QAR ${Number(usage.exceededCharge).toLocaleString()}`
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800 text-xs">
                                  {usage.totalCharge
                                    ? `QAR ${Number(usage.totalCharge).toLocaleString()}`
                                    : `QAR ${(Number(usage.monthlyRent || 0) + Number(usage.exceededCharge || 0)).toLocaleString()}`}
                                </TableCell>
                                <TableCell className="text-center">
                                  {usage.meterImageUrl ? (
                                    <a
                                      href={usage.meterImageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline text-[10px]"
                                    >
                                      View Image
                                    </a>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-2 py-0.5 ${
                                      isBilled
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}
                                  >
                                    {isBilled ? 'BILLED' : 'PENDING'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={onClose} size="sm">
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                <span className="text-sm font-medium">Loading Contract Details...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <InvoiceDetailsDialog
          onClose={() => {
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          mode="FINANCE"
        />
      )}

      {/* Usage Recording Modal */}
      {contract && (
        <UsageRecordingModal
          isOpen={isUsageModalOpen}
          onClose={() => setIsUsageModalOpen(false)}
          contractId={contract.id}
          customerName={contract.customerName}
          onSuccess={fetchData}
        />
      )}
    </>
  );
}
