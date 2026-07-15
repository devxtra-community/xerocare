'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Edit, CreditCard, Banknote } from 'lucide-react';
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
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { PurchaseOriginBadge } from '@/components/PurchaseOriginBadge';
import { PurchaseOrigin } from '@/lib/purchaseOrigin';
import AddPurchaseDialog from './AddPurchaseDialog';
import EditPurchaseDialog from './EditPurchaseDialog';
import AddPaymentModal from './AddPaymentModal';
import AddCostModal from './AddCostModal';
import ViewPurchaseDialog from './ViewPurchaseDialog';
import PurchaseStats from './PurchaseStats';

/**
 * Manager Purchase Management Table.
 * Transitions to dedicated Details Page for full financial tracking.
 */
export default function ManagerPurchaseTable() {
  const currency = useBranchCurrency();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<'ALL' | PurchaseOrigin>('ALL');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await purchaseService.getAllPurchases();
      setPurchases(data);
    } catch {
      toast.error('Failed to fetch lot amounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filtered = purchases.filter(
    (p) =>
      `${p.lotId} ${p.vendorId} ${p.lot?.lotNumber || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (originFilter === 'ALL' || p.purchaseOrigin === originFilter),
  );

  // Stats calculation
  const totalCost = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const domesticSpend = purchases
    .filter((p) => p.purchaseOrigin === PurchaseOrigin.DOMESTIC)
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const internationalSpend = purchases
    .filter((p) => p.purchaseOrigin === PurchaseOrigin.INTERNATIONAL)
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
  const totalVendors = new Set(purchases.map((p) => p.vendorId)).size;
  const totalRecords = purchases.length;

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setEditOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewOpen(true);
  };

  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentOpen(true);
  };

  const handleRecordCost = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setCostOpen(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 italic tracking-tight">
          Lot Amount Records
        </h3>
      </div>

      <PurchaseStats
        totalCost={totalCost}
        totalVendors={totalVendors}
        totalProducts={totalRecords}
        totalPaid={totalPaid}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-green-700">
            Domestic Spend
          </p>
          <p className="mt-1 text-2xl font-black text-green-800">
            {formatCurrency(domesticSpend, currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-green-600/80">
            Vendor country matches branch country
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-blue-700">
            International Spend
          </p>
          <p className="mt-1 text-2xl font-black text-blue-800">
            {formatCurrency(internationalSpend, currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-600/80">Cross-border vendor purchases</p>
        </div>
      </div>

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

        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value as 'ALL' | PurchaseOrigin)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          aria-label="Filter by purchase origin"
        >
          <option value="ALL">All Origins</option>
          <option value={PurchaseOrigin.DOMESTIC}>Domestic</option>
          <option value={PurchaseOrigin.INTERNATIONAL}>International</option>
        </select>

        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-xl font-bold italic shadow-lg shadow-primary/10 transition-all active:scale-95"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={18} /> Add Lot Amount
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
                'Origin',
                'Action',
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-3 py-3 whitespace-nowrap"
                >
                  {h}
                </TableHead>
              ))}
            </tr>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-slate-400 animate-pulse font-bold italic">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                    Syncing Ledger...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400 italic">
                  No lot amount records found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">
                    #{p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-medium text-slate-500 whitespace-nowrap">
                    {p.lot?.lotNumber || p.lotId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-black text-slate-800 whitespace-nowrap">
                    {formatCurrency(p.totalAmount, currency)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-bold text-emerald-600 whitespace-nowrap">
                    {formatCurrency(p.paidAmount, currency)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-bold text-primary whitespace-nowrap">
                    {formatCurrency(p.remainingAmount, currency)}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-black italic border whitespace-nowrap ${
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
                  <TableCell className="px-3 py-3">
                    <PurchaseOriginBadge origin={p.purchaseOrigin} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        className="text-slate-400 hover:text-primary transition-colors"
                        onClick={() => handleView(p)}
                        title="Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        onClick={() => handleEdit(p)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        onClick={() => handleRecordCost(p)}
                        title="Add Cost"
                      >
                        <Banknote size={16} />
                      </button>
                      <button
                        className="text-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleRecordPayment(p)}
                        disabled={p.status === 'PAID'}
                        title="Record Payment"
                      >
                        <CreditCard size={16} />
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
        <>
          <EditPurchaseDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            purchase={selectedPurchase}
            onSuccess={fetchPurchases}
          />
          <AddPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            purchaseId={selectedPurchase.id}
            totalAmount={selectedPurchase.totalAmount}
            paidAmount={selectedPurchase.paidAmount}
            onSuccess={fetchPurchases}
          />
          <AddCostModal
            open={costOpen}
            onOpenChange={setCostOpen}
            purchaseId={selectedPurchase.id}
            onSuccess={fetchPurchases}
          />
          <ViewPurchaseDialog
            open={viewOpen}
            onOpenChange={setViewOpen}
            purchase={selectedPurchase}
            onSuccess={fetchPurchases}
          />
        </>
      )}
    </div>
  );
}
