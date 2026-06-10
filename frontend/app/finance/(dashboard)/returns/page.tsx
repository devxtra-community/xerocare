'use client';

import { useState, useEffect } from 'react';
import ReturnsStatCards from '@/components/returns/ReturnsStatCards';
import ReturnsTable from '@/components/returns/ReturnsTable';
import FinanceApprovalModal from '@/components/returns/FinanceApprovalModal';
import CreditNoteViewModal from '@/components/returns/CreditNoteViewModal';
import {
  getCreditNotes,
  getCreditNoteStats,
  approveCreditNote,
  rejectCreditNote,
} from '@/services/creditNoteService';
import { getCustomers } from '@/lib/customer';
import { toast } from 'sonner';
import { CreditNoteRecord } from '@/lib/invoice';

export default function FinanceReturnsPage() {
  const [stats, setStats] = useState({
    total: 0,
    directRefund: 0,
    replacement: 0,
    creditExchange: 0,
  });
  const [data, setData] = useState<CreditNoteRecord[]>([]);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CreditNoteRecord | null>(null);

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

  const handleApprove = async (approvalData: { financeNote: string; damageReason: string }) => {
    try {
      if (!selectedRecord) return;
      const res = await approveCreditNote(selectedRecord.id, approvalData);
      if (res.data.success) {
        toast.success(res.data.message);
        setIsApproveOpen(false);
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (record: CreditNoteRecord) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const res = await rejectCreditNote(record.id, { rejectionReason: reason });
      if (res.data.success) {
        toast.success('Credit Note rejected');
        fetchData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Finance Returns Approval
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Review and approve credit note requests from sales team
            </p>
          </div>
        </div>

        <ReturnsStatCards stats={stats} />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Pending Approvals</h3>
          <ReturnsTable
            data={data}
            role="FINANCE"
            onView={(r) => {
              setSelectedRecord(r);
              setIsViewOpen(true);
            }}
            onApprove={(r) => {
              setSelectedRecord(r);
              setIsApproveOpen(true);
            }}
            onReject={handleReject}
          />
        </div>
      </div>

      <FinanceApprovalModal
        open={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApprove}
        record={selectedRecord}
      />

      <CreditNoteViewModal
        open={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
}
