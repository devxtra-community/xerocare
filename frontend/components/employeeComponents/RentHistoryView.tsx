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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';

import { getActiveCurrency } from '@/lib/currency';
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
  const { success: toastSuccess, error: toastError } = useToast();
  const [contract, setContract] = useState<Invoice | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // State for viewing invoice details
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // State for recording new usage
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const handleCompleteContract = () => {
    if (!contract) return;
    setConfirmOpen(true);
  };

  const executeCompleteContract = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      await generateConsolidatedFinalInvoice(contract.id);
      await fetchData();
      toastSuccess('Contract completed and final consolidated invoice generated successfully!');
    } catch (error) {
      console.error('Failed to complete contract:', error);
      toastError('Failed to complete contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-muted/50 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-sm">
                <HistoryIcon size={24} />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
                  Rent Contract History
                </DialogTitle>
                <div className="text-xs text-muted-foreground font-medium flex gap-2 items-center">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                    #{contract?.invoiceNumber}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-bold text-muted-foreground uppercase">
                    {contract?.customerName}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : contract ? (
              <>
                {/* Contract Overview Card */}
                <Card className="shadow-sm border-border bg-card">
                  <CardHeader className="pb-3 bg-muted/50 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-primary" /> Contract Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Customer
                      </p>
                      <div className="font-bold text-foreground flex items-center gap-2 text-sm">
                        <User size={14} className="text-muted-foreground" />
                        {contract.customerName}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Duration
                      </p>
                      <div className="font-bold text-foreground flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span>
                          {contract.effectiveFrom &&
                            format(new Date(contract.effectiveFrom), 'dd MMM yyyy')}
                        </span>
                        <span className="text-muted-foreground">→</span>
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
                          className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/30 font-bold text-[10px] uppercase tracking-wider"
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
                      <div className="font-bold text-foreground text-lg flex items-baseline gap-1">
                        {getActiveCurrency()} {contract.monthlyRent?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Management Actions (Finance Only for managing usage) */}
                <Card className="shadow-sm border-border bg-card">
                  <CardHeader className="pb-3 bg-muted/50 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                      Management Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-wrap gap-4">
                    {contract.contractStatus !== 'COMPLETED' ? (
                      <>
                        <Button
                          className="bg-primary hover:bg-primary/90 font-bold text-xs rounded-xl h-10 px-6 gap-2 text-primary-foreground"
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
                      <Badge className="bg-success/10 text-success hover:bg-success/10 px-4 py-2 text-sm">
                        ✓ Contract Completed
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Invoices History Table */}
                <Card className="shadow-sm border-border overflow-hidden bg-card">
                  <CardHeader className="pb-3 bg-muted/50 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                      <Printer size={14} className="text-lease" /> Monthly Usage & Invoices
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-card text-muted-foreground border-border font-mono text-[10px]"
                    >
                      {usageRecords.length} RECORDS
                    </Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-border">
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10">
                            Period
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-right">
                            Monthly Rent
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-center">
                            Total Usage (Norm)
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-center">
                            Exceeded
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-right">
                            Exceeded Charge
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-right">
                            Total Charge
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-center">
                            Meter Image
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10 text-center">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageRecords.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12 text-muted-foreground text-xs font-medium bg-muted/20"
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
                                className="hover:bg-primary/10 border-border transition-colors"
                              >
                                <TableCell className="text-[11px] font-medium text-foreground">
                                  {usage.periodStart
                                    ? format(new Date(usage.periodStart), 'd MMM')
                                    : '-'}
                                  {' - '}
                                  {usage.periodEnd
                                    ? format(new Date(usage.periodEnd), 'd MMM yyyy')
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-foreground">
                                  {usage.monthlyRent
                                    ? `${getActiveCurrency()} ${Number(usage.monthlyRent).toLocaleString()}`
                                    : `${getActiveCurrency()} 0`}
                                </TableCell>
                                <TableCell className="text-center font-mono text-[11px]">
                                  {totalUsage.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center font-mono text-[11px] text-warning">
                                  {usage.exceededTotal ? usage.exceededTotal.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-foreground">
                                  {usage.exceededCharge
                                    ? `${getActiveCurrency()} ${Number(usage.exceededCharge).toLocaleString()}`
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground text-xs">
                                  {usage.totalCharge
                                    ? `${getActiveCurrency()} ${Number(usage.totalCharge).toLocaleString()}`
                                    : `${getActiveCurrency()} ${(Number(usage.monthlyRent || 0) + Number(usage.exceededCharge || 0)).toLocaleString()}`}
                                </TableCell>
                                <TableCell className="text-center">
                                  {usage.meterImageUrl ? (
                                    <a
                                      href={usage.meterImageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-[10px]"
                                    >
                                      View Image
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-2 py-0.5 ${
                                      isBilled
                                        ? 'bg-success/10 text-success border-success/30'
                                        : 'bg-warning/10 text-warning border-warning/30'
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
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      {isUsageModalOpen && contract && (
        <UsageRecordingModal
          isOpen={isUsageModalOpen}
          onClose={() => setIsUsageModalOpen(false)}
          contractId={contract.id}
          customerName={contract.customerName}
          onSuccess={fetchData}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Complete Contract"
        description="Are you sure you want to complete this contract? This will generate the FINAL consolidated invoice."
        type="destructive"
        confirmText="Complete Contract"
        onConfirm={executeCompleteContract}
      />
    </>
  );
}
