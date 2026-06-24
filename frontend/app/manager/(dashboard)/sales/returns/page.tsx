'use client';

import { useState, useEffect } from 'react';
import ReturnsStatCards from '@/components/returns/ReturnsStatCards';
import ReturnsTable from '@/components/returns/ReturnsTable';
import CreditNoteFormModal from '@/components/returns/CreditNoteFormModal';
import CreditNoteViewModal from '@/components/returns/CreditNoteViewModal';
import CompletionModal from '@/components/returns/CompletionModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  getCreditNotes,
  getCreditNoteStats,
  createCreditNote,
  sendToFinance,
  completeCreditNote,
  deleteCreditNote,
} from '@/services/creditNoteService';
import { toast } from 'sonner';
import { CreditNoteRecord, CreateCreditNotePayload } from '@/lib/invoice';
import { CompletionData } from '@/components/returns/CompletionModal';

export default function ManagerReturnsPage() {
  const [stats, setStats] = useState({
    total: 0,
    directRefund: 0,
    replacement: 0,
    creditExchange: 0,
  });
  const [data, setData] = useState<CreditNoteRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CreditNoteRecord | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, listRes] = await Promise.all([getCreditNoteStats(), getCreditNotes()]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (listRes.data.success) setData(listRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (formData: Record<string, string | number | undefined>) => {
    try {
      const res = await createCreditNote(formData as unknown as CreateCreditNotePayload);
      if (res.data.success) {
        toast.success('Draft Credit Note created');
        setIsFormOpen(false);
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create');
    }
  };

  const handleSendToFinance = async (record: CreditNoteRecord) => {
    try {
      const res = await sendToFinance(record.id);
      if (res.data.success) {
        toast.success('Sent to Finance for approval');
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to send');
    }
  };

  const handleDelete = async (record: CreditNoteRecord) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      const res = await deleteCreditNote(record.id);
      if (res.data.success) {
        toast.success('Deleted successfully');
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const handleComplete = async (completeData: CompletionData) => {
    try {
      if (!selectedRecord) return;
      const res = await completeCreditNote(selectedRecord.id, completeData);
      if (res.data.success) {
        toast.success('Return process completed successfully');
        setIsCompleteOpen(false);
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to complete');
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6" suppressHydrationWarning>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Returns Management (Manager)</h2>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Credit Note
        </Button>
      </div>

      <ReturnsStatCards stats={stats} />

      <div className="pt-4">
        <ReturnsTable
          data={data}
          role="MANAGER"
          onView={(r) => {
            setSelectedRecord(r);
            setIsViewOpen(true);
          }}
          onDelete={handleDelete}
          onSend={handleSendToFinance}
          onComplete={(r) => {
            setSelectedRecord(r);
            setIsCompleteOpen(true);
          }}
        />
      </div>

      <CreditNoteFormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreate}
      />

      <CreditNoteViewModal
        open={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        record={selectedRecord}
      />

      <CompletionModal
        open={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        onConfirm={handleComplete}
        record={selectedRecord}
      />
    </div>
  );
}
