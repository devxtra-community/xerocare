'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import { Loader2, History, Send, CheckCircle2, Eye, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UsageHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
}

/**
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
      const response = await sendMonthlyUsageInvoice(record.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recipientEmail = (response as any).recipientEmail;

      if (recipientEmail) {
        toast.success(`Invoice sent successfully to ${recipientEmail}`);
      } else {
        toast.success('Invoice sent successfully via Email and WhatsApp');
      }
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
                      <TableHead className="font-bold text-white text-center">EXCEEDED</TableHead>
                      <TableHead className="font-bold text-white text-right">AMOUNT</TableHead>
                      <TableHead className="font-bold text-white text-right">RENT</TableHead>
                      <TableHead className="font-bold text-blue-400 text-right">
                        ADVANCE USED
                      </TableHead>
                      <TableHead className="font-bold text-blue-400 text-right">
                        FINAL TOTAL
                      </TableHead>
                      <TableHead className="font-bold text-white text-center rounded-tr-[1.5rem]">
                        ACTION
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow
                        key={record.id}
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
                          <div className="flex items-center justify-center gap-2">
                            <UsageDetailsModal record={record} />
                            {record.meterImageUrl ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                onClick={() => setPreviewImage(record.meterImageUrl || null)}
                                title="View Reading Image"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 rounded-full transition-all ${
                                record.emailSentAt
                                  ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                                  : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                              onClick={() => handleSendInvoice(record)}
                              disabled={sendingId === record.id}
                              title={record.emailSentAt ? 'Resend Invoice' : 'Send Invoice'}
                            >
                              {sendingId === record.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : record.emailSentAt ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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

// --- SUB-COMPONENTS ---

function UsageDetailsModal({ record }: { record: UsageRecord }) {
  const formatCurrency = (amount: number) =>
    `₹${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const isFixedLimit = record.rentType === 'FIXED_LIMIT';
  const isFxedCombo = record.rentType === 'FIXED_COMBO';

  const bwUsage = (record.bwA4Delta || 0) + (record.bwA3Delta || 0) * 2;
  const colorUsage = (record.colorA4Delta || 0) + (record.colorA3Delta || 0) * 2;
  const bwLimit = Number(record.bwFreeLimit || 0);
  const colorLimit = Number(record.colorFreeLimit || 0);
  const combinedLimit = Number(record.combinedFreeLimit || 0);

  const bwRate = Number(record.bwExcessRate || 0);
  const colorRate = Number(record.colorExcessRate || 0);
  const combinedRate = Number(record.combinedExcessRate || 0);

  let bwExceeded = 0;
  let colorExceeded = 0;
  let combinedExceeded = 0;

  if (isFixedLimit) {
    bwExceeded = Math.max(0, bwUsage - bwLimit);
    colorExceeded = Math.max(0, colorUsage - colorLimit);
  } else if (isFxedCombo) {
    combinedExceeded = Math.max(0, bwUsage + colorUsage - combinedLimit);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full"
          title="View Detailed Breakdown"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Usage Breakdown</DialogTitle>
          <DialogDescription>
            Period: {new Date(record.periodStart).toLocaleDateString()} -{' '}
            {new Date(record.periodEnd).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Free Limit</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Exceeded</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFixedLimit && (
                <>
                  <TableRow>
                    <TableCell className="font-medium">
                      Black & White
                      <div className="text-[10px] text-slate-500 font-normal">
                        A4: {record.bwA4Delta} | A3: {record.bwA3Delta}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{bwLimit}</TableCell>
                    <TableCell className="text-right">{bwUsage}</TableCell>
                    <TableCell
                      className={`text-right ${bwExceeded > 0 ? 'text-red-600 font-bold' : ''}`}
                    >
                      {bwExceeded}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(bwRate)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bwExceeded * bwRate)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Color
                      <div className="text-[10px] text-slate-500 font-normal">
                        A4: {record.colorA4Delta} | A3: {record.colorA3Delta}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{colorLimit}</TableCell>
                    <TableCell className="text-right">{colorUsage}</TableCell>
                    <TableCell
                      className={`text-right ${colorExceeded > 0 ? 'text-red-600 font-bold' : ''}`}
                    >
                      {colorExceeded}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(colorRate)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(colorExceeded * colorRate)}
                    </TableCell>
                  </TableRow>
                </>
              )}

              {isFxedCombo && (
                <TableRow>
                  <TableCell className="font-medium">
                    Combined
                    <div className="text-[10px] text-slate-500 font-normal">
                      Total: {bwUsage + colorUsage}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{combinedLimit}</TableCell>
                  <TableCell className="text-right">{bwUsage + colorUsage}</TableCell>
                  <TableCell
                    className={`text-right ${combinedExceeded > 0 ? 'text-red-600 font-bold' : ''}`}
                  >
                    {combinedExceeded}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(combinedRate)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(combinedExceeded * combinedRate)}
                  </TableCell>
                </TableRow>
              )}

              {!isFixedLimit && !isFxedCombo && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 italic py-6">
                    Detailed breakdown available for Fixed Limit contracts only.
                    <br />
                    <span className="font-bold mt-2 block">
                      Total Exceeded Charge: {formatCurrency(record.exceededAmount)}
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Readings Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Black & White Readings
            </h4>
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                A4: <strong>{record.bwA4Delta}</strong>
              </span>
              <span>
                A3: <strong>{record.bwA3Delta}</strong>
              </span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Color Readings
            </h4>
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                A4: <strong>{record.colorA4Delta}</strong>
              </span>
              <span>
                A3: <strong>{record.colorA3Delta}</strong>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
