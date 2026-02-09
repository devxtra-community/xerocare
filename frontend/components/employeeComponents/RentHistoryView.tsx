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
  Eye,
  Loader2,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { Invoice, getInvoiceById } from '@/lib/invoice';
import { format } from 'date-fns';
import { InvoiceDetailsDialog } from '../invoice/InvoiceDetailsDialog';
import UsageRecordingModal from '@/components/Finance/UsageRecordingModal';

interface RentHistoryViewProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RentHistoryView({ contractId, isOpen, onClose }: RentHistoryViewProps) {
  const [contract, setContract] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<Invoice[]>([]);
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
      // Assuming the backend populates invoiceHistory or we need to fetch it separately.
      // If invoiceHistory is present on the object:
      setHistory(data.invoiceHistory || []);
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

  const handleViewInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
  };

  const handlePreviousMonth = () => {
    if (history.length === 0) return;
    // By convention, history is desc. If we want "Previous Month", we might need the one after current in list.
    // Since this is a list, maybe we just highlight or open the details for the most recent historical one?
    // Or if they are ALREADY viewing details, that dialog has it.
    // For now, let's make it open the Details Dialog for the second item in history (if current is first)
    if (history.length > 0) {
      handleViewInvoice(history[0]);
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
                        ₹{contract.monthlyRent?.toLocaleString() || '0'}
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
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl h-10 px-6 gap-2 text-white"
                      onClick={() => setIsUsageModalOpen(true)}
                    >
                      <PlusCircle size={16} />
                      Create New Usage
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl h-10 px-6 gap-2"
                      onClick={handlePreviousMonth}
                      disabled={history.length === 0}
                    >
                      <ArrowLeft size={16} />
                      Previous Month
                    </Button>
                  </CardContent>
                </Card>

                {/* Invoices History Table */}
                <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <Printer size={14} className="text-purple-500" /> Generated Invoices
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-white text-slate-500 border-slate-200 font-mono text-[10px]"
                    >
                      {history.length} RECORDS
                    </Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100">
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10">
                            Invoice #
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10">
                            Period
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Usage (A4/A3)
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-right">
                            Amount
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Status
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-right">
                            Date
                          </TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-10 text-center">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-12 text-muted-foreground text-xs font-medium bg-slate-50/20"
                            >
                              No invoices generated yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          history.map((inv) => (
                            <TableRow
                              key={inv.id}
                              className="hover:bg-blue-50/30 border-slate-50 transition-colors"
                            >
                              <TableCell className="font-bold text-blue-600 text-[11px] font-mono">
                                {inv.invoiceNumber}
                              </TableCell>
                              <TableCell className="text-[11px] font-medium text-slate-600">
                                {inv.billingPeriodStart
                                  ? format(new Date(inv.billingPeriodStart), 'd MMM')
                                  : '-'}
                                {' - '}
                                {inv.billingPeriodEnd
                                  ? format(new Date(inv.billingPeriodEnd), 'd MMM yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 min-w-[3rem]">
                                    BW:{' '}
                                    {((inv.bwA4Count || 0) + (inv.bwA3Count || 0)).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 min-w-[3rem]">
                                    Cl:{' '}
                                    {(
                                      (inv.colorA4Count || 0) + (inv.colorA3Count || 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700 text-xs">
                                ₹{inv.totalAmount?.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`
                                                      text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide border shadow-none
                                                      ${
                                                        inv.status === 'PAID'
                                                          ? 'bg-green-50 text-green-700 border-green-200'
                                                          : inv.status === 'SENT'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : inv.status === 'DRAFT'
                                                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                                                              : 'bg-orange-50 text-orange-700 border-orange-200'
                                                      }
                                                  `}
                                >
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] font-medium text-slate-400">
                                {format(new Date(inv.createdAt), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                  onClick={() => handleViewInvoice(inv)}
                                  title="View Invoice Details"
                                >
                                  <Eye size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
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
