import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, X, Printer } from 'lucide-react';
import {
  CompletedCollection,
  getUsageHistory,
  UsageRecord,
  sendConsolidatedInvoice,
  getInvoiceById,
} from '@/lib/invoice';
import { toast } from 'sonner';

interface ConsolidatedStatementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CompletedCollection;
}

/**
 * Modal dialog for viewing a consolidated statement of account.
 * Shows detailed transaction history including usage, rent, and excess charges.
 */
export default function ConsolidatedStatementDialog({
  isOpen,
  onClose,
  collection,
}: ConsolidatedStatementDialogProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<UsageRecord[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch usage history as the primary source of truth for "History"
        // This aligns with user request to show usage records
        const usageData = await getUsageHistory(collection.contractId);
        setHistory(usageData);

        // Also try to fetch summary invoice if available (for future use)
        if (collection.finalInvoiceId) {
          await getInvoiceById(collection.finalInvoiceId);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load statement details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, collection]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Statement of Account
              </DialogTitle>
              <p className="text-sm text-slate-500">
                {collection.customerName} • {collection.invoiceNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Table (Usage History) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Transaction History (Usage & Rent)</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Rent</TableHead>
                      <TableHead className="text-right">Excess</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No usage history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {history.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium text-slate-700">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">
                                  {new Date(record.periodStart).toLocaleDateString()} -{' '}
                                  {new Date(record.periodEnd).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-medium text-slate-900">
                                  {record.totalUsage?.toLocaleString() || 0} units
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              ₹{Number(record.rent || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              ₹{Number(record.exceededAmount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              ₹{Number(record.finalTotal || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {collection.advanceAmount
                          ? collection.advanceAmount > 0 && (
                              <TableRow className="bg-orange-50/30">
                                <TableCell className="font-medium text-orange-700">
                                  <span className="text-sm font-bold uppercase tracking-tight">
                                    Advance Amount (Adjustable)
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right font-black text-orange-700">
                                  ₹{collection.advanceAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            )
                          : null}
                        {collection.securityDepositAmount
                          ? collection.securityDepositAmount > 0 && (
                              <TableRow className="bg-blue-50/30">
                                <TableCell className="font-medium text-blue-700">
                                  <span className="text-sm font-bold uppercase tracking-tight">
                                    Security Deposit (Collected)
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right font-black text-blue-700">
                                  ₹{collection.securityDepositAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            )
                          : null}
                        {/* Grand Total Row */}
                        <TableRow className="bg-slate-50 border-t-2 border-slate-200 hover:bg-slate-50">
                          <TableCell
                            colSpan={4}
                            className="text-right font-black text-slate-800 uppercase tracking-wider py-4"
                          >
                            Grand Total
                          </TableCell>
                          <TableCell className="text-right font-black text-2xl text-blue-700 py-4">
                            ₹
                            {history
                              .reduce((sum, record) => sum + Number(record.finalTotal || 0), 0)
                              .toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Financial Summary Section */}
        <div className="px-6 py-6 bg-white border-t border-slate-200">
          <div className="bg-slate-50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Left: Security Deposit (Informational) */}
            <div className="w-full md:w-1/2">
              {collection.securityDepositAmount && collection.securityDepositAmount > 0 ? (
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Security Deposit Held
                    </h4>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-blue-600">
                      ₹{collection.securityDepositAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                      {collection.securityDepositMode || 'RECORDED'}
                    </span>
                  </div>
                  {collection.securityDepositReference && (
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      Ref: {collection.securityDepositReference}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 font-medium italic text-sm text-center md:text-left">
                  Note: No security deposit records found for this contract.
                </div>
              )}
            </div>

            {/* Right: Grand Total */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-end">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                Final Settlement
              </span>
              <div className="flex flex-col items-center md:items-end">
                <span className="text-4xl font-black text-slate-900 leading-none">
                  ₹
                  {Number(
                    (collection.grossAmount || 0) - (collection.advanceAdjusted || 0),
                  ).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 mt-2 bg-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter">
                  Grand Total Due
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-white flex justify-end items-center gap-3">
          <div className="flex flex-col items-end gap-1 px-4 border-r border-slate-100 mr-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Sending to Recipient
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {collection.customerEmail || 'No email found'}
            </span>
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            onClick={() => {
              toast.promise(sendConsolidatedInvoice(collection.contractId), {
                loading: `Sending Statement to ${collection.customerEmail || 'customer email'}...`,
                success: () =>
                  `Statement sent successfully to ${collection.customerEmail || 'customer'}`,
                error: (err) =>
                  `Failed to send to ${collection.customerEmail || 'email'}. ${err.message || ''}`,
              });
            }}
          >
            <div className="mr-2">✉️</div>
            Send via Email
          </Button>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
