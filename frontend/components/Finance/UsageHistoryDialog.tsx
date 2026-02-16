'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getUsageHistory, UsageRecord, sendMonthlyUsageInvoice } from '@/lib/invoice';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Send, CheckCircle2, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UsageHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
}

/**
 * Modal dialog for viewing historical usage records of a contract.
 * Displays past meter readings, usage counts, excess charges, and invoice status.
 */
export default function UsageHistoryDialog({
  isOpen,
  onClose,
  contractId,
  customerName,
}: UsageHistoryDialogProps) {
  const [history, setHistory] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchHistory = React.useCallback(() => {
    if (isOpen && contractId) {
      setLoading(true);
      getUsageHistory(contractId)
        .then((data) => setHistory(data))
        .catch((err) => {
          console.error('Failed to fetch usage history', err);
          toast.error('Failed to load usage history');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, contractId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSendInvoice = async (record: UsageRecord) => {
    setSendingId(record.id);
    try {
      await sendMonthlyUsageInvoice(record.id);
      toast.success('Invoice sent successfully via Email and WhatsApp');
      fetchHistory();
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || 'Failed to send invoice');
    } finally {
      setSendingId(null);
    }
  };

  const formatDateLabel = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM dd')} - ${format(new Date(end), 'MMM dd, yyyy')}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none bg-white shadow-2xl">
          {/* Modern Header */}
          <DialogHeader className="p-8 pb-6 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                  <History className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
                    Usage History
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                      Contract Audit for:
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-900 font-bold px-3 py-1 rounded-full border-none"
                    >
                      {customerName}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-5"
              >
                <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Sync Logs
              </Button>
            </div>
          </DialogHeader>

          {/* Dynamic Table Body */}
          <div className="flex-1 overflow-auto p-8 pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-80 gap-4 text-slate-400">
                <div className="p-6 bg-blue-50/50 rounded-full animate-pulse">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                </div>
                <p className="font-bold text-lg">Aggregating contract data...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 gap-6 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <History className="h-16 w-16 text-slate-200" />
                <div className="text-center">
                  <p className="text-slate-900 font-bold text-xl">No usage records found</p>
                  <p className="text-slate-400 mt-1">
                    Meter readings will appear here after they are recorded.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-900 border-none">
                    <TableRow className="hover:bg-slate-900 border-none">
                      <TableHead className="font-bold text-white py-5 px-6">PERIOD</TableHead>
                      <TableHead className="font-bold text-white text-right">FREE LIMIT</TableHead>
                      <TableHead className="font-bold text-white text-right">TOTAL USAGE</TableHead>
                      <TableHead className="font-bold text-white text-right">EXCEEDED</TableHead>
                      <TableHead className="font-bold text-white text-right">RATE</TableHead>
                      <TableHead className="font-bold text-white text-right">AMOUNT</TableHead>
                      <TableHead className="font-bold text-white text-right">RENT</TableHead>
                      <TableHead className="font-bold text-blue-400 text-right">
                        ADVANCE USED
                      </TableHead>
                      <TableHead className="font-bold text-blue-400 text-right">
                        FINAL TOTAL
                      </TableHead>
                      <TableHead className="font-bold text-white text-center">STATUS</TableHead>
                      <TableHead className="font-bold text-white text-center">IMAGE</TableHead>
                      <TableHead className="font-bold text-white text-right pr-6 rounded-tr-[1.5rem]">
                        ACTION
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record, index) => (
                      <TableRow
                        key={index}
                        className="group border-b border-slate-50 last:border-0 hover:bg-blue-50/20 transition-all duration-300"
                      >
                        <TableCell className="py-6 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">
                              {formatDateLabel(record.periodStart, record.periodEnd)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-black uppercase mt-0.5">
                              {format(new Date(record.periodStart), 'MMMM yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-500">
                          {record.freeLimit === 'No Free Limit' ? (
                            <span className="text-[10px] text-slate-300 italic">No Limit</span>
                          ) : (
                            Number(record.freeLimit).toLocaleString()
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-slate-900 text-sm">
                              {record.totalUsage.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              Units
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-black ${record.exceededCount > 0 ? 'text-orange-600' : 'text-emerald-500'}`}
                          >
                            {record.exceededCount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-600 text-xs">
                          ₹{Number(record.rate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-black text-orange-600 text-sm">
                            ₹
                            {Number(record.exceededAmount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700">
                          ₹{Number(record.rent).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          ₹{Number(record.advanceAdjusted || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right bg-blue-50/30 group-hover:bg-blue-100/50 transition-colors">
                          <span className="font-black text-blue-700 text-base">
                            ₹
                            {Number(record.finalTotal).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`rounded-full px-3 py-1 text-[10px] font-black border-none shadow-sm ${
                              record.exceededCount > 0
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {record.exceededCount > 0 ? 'EXCEEDED' : 'WITHIN LIMIT'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {record.meterImageUrl ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl shadow-sm transition-all hover:scale-110"
                              onClick={() => setPreviewImage(record.meterImageUrl || null)}
                              title="View Reading Image"
                            >
                              <Eye className="h-4 w-4" strokeWidth={3} />
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-200 font-bold uppercase">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl gap-2 font-bold px-4 transition-all"
                            onClick={() => handleSendInvoice(record)}
                            disabled={sendingId === record.id}
                          >
                            {sendingId === record.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : record.emailSentAt ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            <span className="text-xs tracking-tight">
                              {record.emailSentAt ? 'Resend Invoice' : 'Send Invoice'}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogTitle className="sr-only">Meter Reading Image Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Visual confirmation of the meter reading for this billing period.
          </DialogDescription>
          {previewImage && (
            <div className="relative group w-full flex justify-center">
              <Image
                src={previewImage}
                alt="Meter Reading"
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-4 border-white/20 backdrop-blur-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full h-12 w-12 shadow-xl backdrop-blur-md transition-all hover:scale-110"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-7 w-7" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
