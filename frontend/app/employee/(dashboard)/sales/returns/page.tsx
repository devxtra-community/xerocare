'use client';

import { useState, useEffect } from 'react';
import ReturnsStatCards from '@/components/returns/ReturnsStatCards';
import ReturnsTable from '@/components/returns/ReturnsTable';
import CreditNoteFormModal from '@/components/returns/CreditNoteFormModal';
import CreditNoteViewModal from '@/components/returns/CreditNoteViewModal';
import CompletionModal from '@/components/returns/CompletionModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getCreditNotes,
  getCreditNoteStats,
  createCreditNote,
  sendToFinance,
  completeCreditNote,
  deleteCreditNote,
  updateCreditNote,
} from '@/services/creditNoteService';
import { getCustomers } from '@/lib/customer';
import { toast } from 'sonner';
import { CreditNoteRecord, CreateCreditNotePayload, UpdateCreditNotePayload } from '@/lib/invoice';
import { CompletionData } from '@/components/returns/CompletionModal';

export default function EmployeeReturnsPage() {
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CreditNoteRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<CreditNoteRecord | null>(null);

  const fetchData = async () => {
    try {
      const [statsRes, listRes, customers] = await Promise.all([
        getCreditNoteStats(),
        getCreditNotes(),
        getCustomers(),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (listRes.data.success) {
        const enriched = listRes.data.data.map((record: CreditNoteRecord) => ({
          ...record,
          customerName:
            record.customerName ||
            customers.find((c: { id: string; name: string }) => c.id === record.customerId)?.name ||
            '—',
        }));
        setData(enriched);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (formData: Record<string, string | number | undefined>) => {
    try {
      if (selectedRecord) {
        const res = await updateCreditNote(
          selectedRecord.id,
          formData as unknown as UpdateCreditNotePayload,
        );
        if (res.data.success) {
          toast.success('Credit Note updated');
          setIsFormOpen(false);
          setSelectedRecord(null);
          fetchData();
        }
      } else {
        const res = await createCreditNote(formData as unknown as CreateCreditNotePayload);
        if (res.data.success) {
          toast.success('Draft Credit Note created');
          setIsFormOpen(false);
          fetchData();
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || (selectedRecord ? 'Failed to update' : 'Failed to create'),
      );
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

  const handleDeleteRequest = (record: CreditNoteRecord) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCreditNote(recordToDelete.id);
      if (res.data.success) {
        toast.success('Deleted successfully');
        setIsDeleteDialogOpen(false);
        setRecordToDelete(null);
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
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
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Returns Management
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Manage product returns, exchanges and credit notes
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedRecord(null);
              setIsFormOpen(true);
            }}
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Credit Note
          </Button>
        </div>

        <ReturnsStatCards stats={stats} />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Returns Tracker</h3>
          <ReturnsTable
            data={data}
            role="EMPLOYEE"
            onView={(r) => {
              setSelectedRecord(r);
              setIsViewOpen(true);
            }}
            onEdit={(r) => {
              setSelectedRecord(r);
              setIsFormOpen(true);
            }}
            onDelete={handleDeleteRequest}
            onSend={handleSendToFinance}
            onComplete={(r) => {
              setSelectedRecord(r);
              setIsCompleteOpen(true);
            }}
          />
        </div>
      </div>

      <CreditNoteFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedRecord(null);
        }}
        onSave={handleSave}
        record={selectedRecord}
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

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Credit Note"
        description={`Are you sure you want to delete the credit note draft for ${recordToDelete?.customerName}? This action cannot be undone.`}
        type="destructive"
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
