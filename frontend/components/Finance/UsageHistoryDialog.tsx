'use client';

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
import { getUsageHistory, UsageRecord } from '@/lib/invoice';
import { format } from 'date-fns';
import { Loader2, History, ExternalLink } from 'lucide-react';

interface UsageHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  customerName: string;
}

export default function UsageHistoryDialog({
  isOpen,
  onClose,
  contractId,
  customerName,
}: UsageHistoryDialogProps) {
  const [history, setHistory] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && contractId) {
      setLoading(true);
      getUsageHistory(contractId)
        .then((data) => {
          setHistory(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, contractId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            <DialogTitle>Usage History - {customerName}</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 mt-4 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Period</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">BW A4</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">BW A3</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Color A4</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Color A3</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Recorded On</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Meter Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No usage records found for this contract.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(record.billingPeriodStart), 'MMM yyyy')}
                      </TableCell>
                      <TableCell>{record.bwA4Count.toLocaleString()}</TableCell>
                      <TableCell>{record.bwA3Count.toLocaleString()}</TableCell>
                      <TableCell>{record.colorA4Count.toLocaleString()}</TableCell>
                      <TableCell>{record.colorA3Count.toLocaleString()}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(record.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {record.meterImageUrl ? (
                          <a
                            href={record.meterImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-500 hover:text-blue-700 font-medium text-[10px]"
                          >
                            View <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
