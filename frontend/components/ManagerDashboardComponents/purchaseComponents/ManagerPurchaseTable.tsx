'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { purchaseService, Purchase } from '@/services/purchaseService';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import AddPurchaseDialog from './AddPurchaseDialog';
import EditPurchaseDialog from './EditPurchaseDialog';
import PurchaseStats from './PurchaseStats';

/**
 * Manager Purchase Management Table.
 * Transitions to dedicated Details Page for full financial tracking.
 */
export default function ManagerPurchaseTable() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await purchaseService.getAllPurchases();
      setPurchases(data);
    } catch {
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filtered = purchases.filter((p) =>
    `${p.lotId} ${p.vendorId} ${p.lot?.lot_number || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Stats calculation
  const totalCost = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
  const totalVendors = new Set(purchases.map((p) => p.vendorId)).size;
  const totalRecords = purchases.length;

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setEditOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    router.push(`/manager/purchases/${purchase.id}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 italic tracking-tight">
          Financial Records
        </h3>
      </div>

      <PurchaseStats
        totalCost={totalCost}
        totalVendors={totalVendors}
        totalProducts={totalRecords}
        totalPaid={totalPaid}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search lot or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl border-slate-200 bg-white"
          />
        </div>

        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-xl font-bold italic shadow-lg shadow-primary/10 transition-all active:scale-95"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={18} /> Add Purchase
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <tr className="bg-slate-50/50">
              {[
                'Order ID',
                'Lot Reference',
                'Total Value',
                'Paid Amount',
                'Balance',
                'Status',
                'Action',
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-6 py-4"
                >
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-slate-400 animate-pulse font-bold italic">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                    Syncing Ledger...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 italic">
                  No financial records found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4 font-bold text-slate-700">
                    #{p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-slate-500">
                    {p.lot?.lot_number || p.lotId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-black text-slate-800">
                    {formatCurrency(p.totalAmount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-emerald-600">
                    {formatCurrency(p.paidAmount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-primary">
                    {formatCurrency(p.remainingAmount)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black italic border ${
                        p.status === 'PAID'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : p.status === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex gap-4">
                      <button
                        className="text-slate-400 hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold"
                        onClick={() => handleView(p)}
                      >
                        <Eye size={16} /> Details
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        onClick={() => handleEdit(p)}
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddPurchaseDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchPurchases} />

      {selectedPurchase && (
        <EditPurchaseDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          purchase={selectedPurchase}
          onSuccess={fetchPurchases}
        />
      )}
    </div>
  );
}
