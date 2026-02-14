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

export default function ConsolidatedStatementDialog({
  isOpen,
  onClose,
  collection,
}: ConsolidatedStatementDialogProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<UsageRecord[]>([]);

  const fetchDetails = React.useCallback(async () => {
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
  }, [collection.contractId, collection.finalInvoiceId]);

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, fetchDetails]);

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

        <div className="p-4 border-t bg-white flex justify-between items-center bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              onClick={() => {
                toast.promise(sendConsolidatedInvoice(collection.contractId), {
                  loading: 'Sending via WhatsApp...',
                  success: 'Sent via WhatsApp',
                  error: 'Failed to send',
                });
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 mr-2 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              onClick={() => {
                toast.promise(sendConsolidatedInvoice(collection.contractId), {
                  loading: 'Sending via Email...',
                  success: 'Sent via Email',
                  error: 'Failed to send',
                });
              }}
            >
              <div className="mr-2">✉️</div>
              Email
            </Button>
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
