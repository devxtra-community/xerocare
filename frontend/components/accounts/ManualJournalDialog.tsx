'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { createManualJournalEntry } from '@/lib/finance/accountsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const today = new Date().toISOString().slice(0, 10);

interface Props {
  account: { id: string; accountNumber: string; accountName: string };
  onClose: () => void;
  onPosted: () => void;
}

export default function ManualJournalDialog({ account, onClose, onPosted }: Props) {
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const qc = useQueryClient();
  const postMut = useMutation({
    mutationFn: () =>
      createManualJournalEntry({
        chartOfAccountId: account.id,
        date,
        amount: parseFloat(amount),
        description,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Journal entry posted');
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-chart-of-accounts'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
      qc.invalidateQueries({ queryKey: ['profit-loss'] });
      qc.invalidateQueries({ queryKey: ['manual-journal-entries', account.id] });
      onPosted();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to post journal entry');
    },
  });

  const parsedAmount = parseFloat(amount);
  const canSubmit =
    !Number.isNaN(parsedAmount) && parsedAmount !== 0 && description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-slate-800">
            Post Journal Entry — {account.accountNumber} {account.accountName}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Positive amount increases this account&apos;s balance, negative decreases it. This is a
            single-sided posting (same as Equity Entries) — post an offsetting entry elsewhere if
            this needs to keep the books balanced.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000 or -1200"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="What is this entry for?"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => postMut.mutate()} disabled={!canSubmit || postMut.isPending}>
            {postMut.isPending ? 'Posting...' : 'Post Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}
