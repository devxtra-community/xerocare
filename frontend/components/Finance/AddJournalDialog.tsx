'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { JournalEntry, mockJournals, chartOfAccounts } from '@/lib/finance';

const postingAccounts = chartOfAccounts.filter((acc) => !acc.isGroup && acc.status === 'Active');

const createEmptyJournal = (): JournalEntry => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split('T')[0],
  reference: '',
  status: 'Draft',
  lines: [
    {
      id: crypto.randomUUID(),
      accountId: '',
      debit: 0,
      credit: 0,
    },
  ],
});

export default function AddJournalDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [journal, setJournal] = useState<JournalEntry>(createEmptyJournal());

  // /* Reset form on open */
  // useEffect(() => {
  //   if (open) {
  //     setJournal(createEmptyJournal());
  //   }
  // }, [open]);

  /* ---------------- TOTALS ---------------- */

  const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);

  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const hasInvalidLine = journal.lines.some(
    (l) => !l.accountId || (l.debit === 0 && l.credit === 0),
  );

  const canSaveDraft = isBalanced && !hasInvalidLine;

  /* ---------------- LINE HANDLERS ---------------- */

  const updateLine = (index: number, updatedLine: JournalEntry['lines'][0]) => {
    const updated = [...journal.lines];
    updated[index] = updatedLine;
    setJournal({ ...journal, lines: updated });
  };

  const removeLine = (id: string) => {
    if (journal.lines.length === 1) return;
    setJournal({
      ...journal,
      lines: journal.lines.filter((l) => l.id !== id),
    });
  };

  /* ---------------- SAVE (DRAFT ONLY) ---------------- */

  const saveDraft = () => {
    mockJournals.push(journal);
    onClose();
  };

  /* ---------------- RENDER ---------------- */

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setJournal(createEmptyJournal());
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Journal Entry</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={journal.date}
            onChange={(e) => setJournal({ ...journal, date: e.target.value })}
          />

          <Input
            placeholder="Reference / Description"
            value={journal.reference}
            onChange={(e) => setJournal({ ...journal, reference: e.target.value })}
          />
        </div>

        {/* Lines */}
        <div className="mt-6 space-y-2">
          {journal.lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-6 gap-2 items-center">
              <Select
                value={line.accountId}
                onValueChange={(value) => updateLine(index, { ...line, accountId: value })}
              >
                <SelectTrigger className="col-span-2">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {postingAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Debit"
                value={line.debit || ''}
                onChange={(e) =>
                  updateLine(index, {
                    ...line,
                    debit: Number(e.target.value),
                    credit: 0,
                  })
                }
              />

              <Input
                type="number"
                placeholder="Credit"
                value={line.credit || ''}
                onChange={(e) =>
                  updateLine(index, {
                    ...line,
                    credit: Number(e.target.value),
                    debit: 0,
                  })
                }
              />

              <Button variant="ghost" onClick={() => removeLine(line.id)}>
                ✕
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="mt-3"
          onClick={() =>
            setJournal({
              ...journal,
              lines: [
                ...journal.lines,
                {
                  id: crypto.randomUUID(),
                  accountId: '',
                  debit: 0,
                  credit: 0,
                },
              ],
            })
          }
        >
          + Add Line
        </Button>

        {/* Totals */}
        <div className="mt-4 flex justify-between text-sm">
          <span>Total Debit: {totalDebit}</span>
          <span>Total Credit: {totalCredit}</span>
        </div>

        {!isBalanced && (
          <p className="text-sm text-red-500">Journal must be balanced before saving</p>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button disabled={!canSaveDraft} onClick={saveDraft}>
            Save as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
