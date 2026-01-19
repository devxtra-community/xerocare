'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertCircle, CheckCircle2, UploadCloud, Info, Trash2, Database } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chartOfAccounts } from '@/lib/finance/finance';

const postingAccounts = chartOfAccounts.filter((acc) => !acc.isGroup && acc.status === 'Active');

export default function AddJournalDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [journal, setJournal] = useState({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    reference: '',
    lines: [{ id: crypto.randomUUID(), accountId: '', debit: 0, credit: 0 }],
  });

  // Calculate Balance for Manual Entry
  const totals = useMemo(() => {
    const dr = journal.lines.reduce((s, l) => s + l.debit, 0);
    const cr = journal.lines.reduce((s, l) => s + l.credit, 0);
    return { dr, cr, balanced: dr === cr && dr > 0 };
  }, [journal.lines]);

  /* ---------------- HANDLERS ---------------- */
  const addLine = () =>
    setJournal((p) => ({
      ...p,
      lines: [...p.lines, { id: crypto.randomUUID(), accountId: '', debit: 0, credit: 0 }],
    }));

  const updateLine = (id: string, field: string, val: string | number) => {
    setJournal((p) => ({
      ...p,
      lines: p.lines.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
    }));
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 2026 Logic: In production, use PapaParse or XLSX libraries to parse CSV/Excel
    console.log('File detected for migration:', e.target.files?.[0]?.name);
    alert('Bulk Migration Mode: Processing template with AI mapping... (Simulated)');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl p-0 border-none shadow-2xl overflow-hidden bg-white">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'manual' | 'bulk')}
          className="w-full"
        >
          <DialogHeader className="p-6 bg-slate-50 border-b flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Journal Entry Center
              </DialogTitle>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Data Migration & Ledger Management 2026
              </p>
            </div>
            <TabsList className="bg-slate-200/50 p-1">
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-white px-4 text-xs font-bold uppercase"
              >
                Manual
              </TabsTrigger>
              <TabsTrigger
                value="bulk"
                className="data-[state=active]:bg-white px-4 text-xs font-bold uppercase"
              >
                Bulk Migration
              </TabsTrigger>
            </TabsList>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* MANUAL ENTRY TAB */}
            <TabsContent value="manual" className="m-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Posting Date
                  </label>
                  <Input
                    type="date"
                    value={journal.date}
                    onChange={(e) => setJournal({ ...journal, date: e.target.value })}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Reference / Description
                  </label>
                  <Input
                    placeholder="Migration Opening Balance 2026"
                    value={journal.reference}
                    onChange={(e) => setJournal({ ...journal, reference: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="text-left p-3 pl-6">GL Account</th>
                      <th className="text-right p-3 w-32">Debit (DR)</th>
                      <th className="text-right p-3 w-32">Credit (CR)</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journal.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="p-2 pl-6">
                          <Select
                            value={l.accountId}
                            onValueChange={(v) => updateLine(l.id, 'accountId', v)}
                          >
                            <SelectTrigger className="h-9 border-none shadow-none focus:ring-0 font-medium">
                              <SelectValue placeholder="Select account..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {postingAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code} — {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={l.debit || ''}
                            onChange={(e) => updateLine(l.id, 'debit', parseFloat(e.target.value))}
                            className="text-right h-9 font-mono bg-transparent border-none"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={l.credit || ''}
                            onChange={(e) => updateLine(l.id, 'credit', parseFloat(e.target.value))}
                            className="text-right h-9 font-mono bg-transparent border-none"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setJournal((p) => ({
                                ...p,
                                lines: p.lines.filter((x) => x.id !== l.id),
                              }))
                            }
                          >
                            <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 bg-slate-50/50 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addLine}
                    className="text-blue-600 font-bold text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Entry Row
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* BULK MIGRATION TAB */}
            <TabsContent value="bulk" className="m-0 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
                <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div className="space-y-1">
                  <h4 className="font-bold text-blue-900">ERP Migration Best Practices 2026</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Bulk migration allows for thousands of historical transactions. Use our{' '}
                    <strong>CSV/Excel templates</strong> to ensure AI-driven mapping validates your
                    trial balance before import.
                  </p>
                </div>
              </div>

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-300 transition-colors bg-slate-50/30 group">
                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tight">
                    Drop Migration File
                  </p>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold">
                    CSV, XLSX, or TXT (Max 50MB)
                  </p>
                </div>
                <Input type="file" id="bulk-up" className="hidden" onChange={handleBulkUpload} />
                <Button
                  onClick={() => document.getElementById('bulk-up')?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Select File
                </Button>
              </div>
            </TabsContent>
          </div>

          <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              {totals.balanced ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {totals.balanced ? 'Ready to Post' : 'Trial Balance Out of Sync'}
              </span>
            </div>
            <div className="flex gap-8 font-mono text-sm">
              <p>DR: {totals.dr.toLocaleString()}</p>
              <p>CR: {totals.cr.toLocaleString()}</p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="font-bold text-xs uppercase text-slate-500 tracking-widest"
            >
              Cancel
            </Button>
            <Button
              disabled={activeTab === 'manual' && !totals.balanced}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest px-8 shadow-lg shadow-blue-200"
            >
              {activeTab === 'manual' ? 'Save Draft' : 'Analyze & Migrate'}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
